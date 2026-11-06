import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { canAdvance, cancelKind, canRefund, validateRefundAmount, type OrderStatus } from "@/lib/orders/transitions";
import { prisma } from "@/lib/prisma";
import { AdminError } from "@/services/admin/products";
import { logAudit, type Actor } from "@/services/admin/audit";
import { sendRefundEmail, sendShippedEmail } from "@/services/email";
import { getRazorpay, lockOrder, recordRefund } from "@/services/payments";

export const ORDERS_PER_PAGE = 25;

/* ───────────────────────── Reading ───────────────────────── */

export async function listAdminOrders(args: { status?: OrderStatus; q?: string; page?: number } = {}) {
  const where: Prisma.OrderWhereInput = {
    ...(args.status && { status: args.status }),
    ...(args.q && {
      OR: [
        { orderNumber: { contains: args.q, mode: "insensitive" } },
        { email: { contains: args.q, mode: "insensitive" } },
        { customerName: { contains: args.q, mode: "insensitive" } },
        { phone: { contains: args.q } },
      ],
    }),
  };
  const page = Math.max(1, args.page ?? 1);
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
      select: { id: true, orderNumber: true, customerName: true, email: true, status: true, totalPaise: true, createdAt: true, profileId: true },
    }),
  ]);
  return { orders, total, page, totalPages: Math.max(1, Math.ceil(total / ORDERS_PER_PAGE)) };
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
      profile: { select: { id: true, email: true, fullName: true } },
      coupon: { select: { code: true } },
    },
  });
}

/* ───────────────────────── Fulfilment ───────────────────────── */

/** PAID -> PROCESSING and SHIPPED -> DELIVERED (shipping itself needs tracking details: see markShipped). */
export async function advanceOrder(id: string, to: "PROCESSING" | "DELIVERED", actor: Actor) {
  const result = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUnique({ where: { id }, select: { status: true, orderNumber: true } });
    if (!order) throw new AdminError("Order not found.");
    if (!canAdvance(order.status, to)) throw new AdminError(`An order that is "${order.status}" cannot be moved to "${to}".`);
    await tx.order.update({ where: { id }, data: { status: to } });
    if (to === "DELIVERED") {
      await tx.shipment.updateMany({ where: { orderId: id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    }
    return { from: order.status, orderNumber: order.orderNumber };
  });
  await logAudit(actor, { action: "order.status", entity: "Order", entityId: id, summary: `${result.orderNumber}: ${result.from} -> ${to}` });
}

export type ShipmentInput = { carrier: string; trackingNumber: string; trackingUrl: string | null };

/** PROCESSING -> SHIPPED, recording carrier + tracking, then emails the customer. */
export async function markShipped(id: string, shipment: ShipmentInput, actor: Actor) {
  const orderNumber = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUnique({ where: { id }, select: { status: true, orderNumber: true } });
    if (!order) throw new AdminError("Order not found.");
    if (!canAdvance(order.status, "SHIPPED")) throw new AdminError("Only an order that is being processed can be marked as shipped.");
    await tx.shipment.upsert({
      where: { orderId: id },
      update: { ...shipment, status: "IN_TRANSIT", shippedAt: new Date() },
      create: { orderId: id, ...shipment, status: "IN_TRANSIT", shippedAt: new Date() },
    });
    await tx.order.update({ where: { id }, data: { status: "SHIPPED" } });
    return order.orderNumber;
  });
  await logAudit(actor, { action: "order.shipped", entity: "Order", entityId: id, summary: `${orderNumber} shipped via ${shipment.carrier} (${shipment.trackingNumber})` });
  await sendShippedEmail(id).catch((e) => console.error("shipped email failed", e));
}

/** Corrects the carrier/tracking of an order that is already shipped. */
export async function updateShipment(id: string, shipment: ShipmentInput, actor: Actor) {
  const existing = await prisma.shipment.findUnique({ where: { orderId: id } });
  if (!existing) throw new AdminError("This order has no shipment yet.");
  await prisma.shipment.update({ where: { orderId: id }, data: shipment });
  await logAudit(actor, { action: "order.shipment", entity: "Order", entityId: id, summary: `Shipment updated: ${shipment.carrier} (${shipment.trackingNumber})` });
}

/* ───────────────────────── Cancel & refund ───────────────────────── */

/**
 * Cancels an order.
 *  - unpaid: just releases the stock held for it;
 *  - paid and not yet shipped: refunds the customer in full through Razorpay FIRST (if that call fails
 *    nothing changes), then puts the stock back and marks the order refunded.
 */
export async function cancelOrder(id: string, actor: Actor) {
  const order = await prisma.order.findUnique({ where: { id }, include: { payments: true, items: true } });
  if (!order) throw new AdminError("Order not found.");
  const kind = cancelKind(order.status);
  if (!kind) throw new AdminError(`An order that is "${order.status}" cannot be cancelled. Use a refund instead if the customer needs their money back.`);

  if (kind === "release-stock") {
    await prisma.$transaction(async (tx) => {
      await lockOrder(tx, id);
      const fresh = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (fresh.status !== "PENDING_PAYMENT") throw new AdminError("The order changed while you were cancelling it. Reload and check its status.");
      for (const item of fresh.items) {
        if (!item.variantId) continue;
        await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${item.quantity}, 0) WHERE "variantId" = ${item.variantId}`;
      }
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.payment.updateMany({ where: { orderId: id, status: { in: ["CREATED", "PENDING", "FAILED"] } }, data: { status: "FAILED", failureReason: "Cancelled by admin" } });
    });
    await logAudit(actor, { action: "order.cancel", entity: "Order", entityId: id, summary: `${order.orderNumber} cancelled (unpaid, stock released)` });
    return;
  }

  // Paid, not shipped: refund then restock.
  const payment = order.payments.find((p) => p.status === "SUCCEEDED" && p.providerPaymentId);
  if (!payment?.providerPaymentId) throw new AdminError("No successful payment was found for this order, so it cannot be refunded automatically. Check Razorpay.");
  const remaining = payment.amountPaise - payment.refundedPaise;
  if (remaining > 0) {
    try {
      await getRazorpay().payments.refund(payment.providerPaymentId, { amount: remaining });
    } catch (e) {
      console.error("cancelOrder: Razorpay refund failed", order.orderNumber, e);
      throw new AdminError("Razorpay could not process the refund, so the order was NOT cancelled. Please try again or refund from the Razorpay dashboard.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const fresh = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (fresh.status !== "PAID" && fresh.status !== "PROCESSING") {
      console.error("cancelOrder: refund issued but order status changed concurrently - CHECK MANUALLY", order.orderNumber, fresh.status);
      throw new AdminError("The refund was issued, but the order changed at the same moment. Please open the order and check its status.");
    }
    for (const item of fresh.items) {
      if (!item.variantId) continue;
      await tx.$executeRaw`UPDATE "Inventory" SET "quantity" = "quantity" + ${item.quantity} WHERE "variantId" = ${item.variantId}`;
    }
    await tx.payment.update({ where: { id: payment.id }, data: { refundedPaise: payment.amountPaise, status: "REFUNDED" } });
    await tx.order.update({ where: { id }, data: { status: "REFUNDED" } });
  });
  await logAudit(actor, { action: "order.cancel", entity: "Order", entityId: id, summary: `${order.orderNumber} cancelled: refunded ${remaining} paise and stock restored`, diff: { refundedPaise: remaining } });
  await sendRefundEmail(id, remaining).catch((e) => console.error("refund email failed", e));
}

/** Full or partial refund of money already taken (does not change stock). */
export async function refundOrder(id: string, amountPaise: number, actor: Actor) {
  const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } });
  if (!order) throw new AdminError("Order not found.");
  const payment = order.payments.find((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED");
  if (!payment?.providerPaymentId) throw new AdminError("No successful payment was found for this order.");
  if (!canRefund(order.status, payment.amountPaise, payment.refundedPaise)) throw new AdminError("This order cannot be refunded (not paid, or already fully refunded).");
  const problem = validateRefundAmount(amountPaise, payment.amountPaise, payment.refundedPaise);
  if (problem) throw new AdminError(problem);

  try {
    await getRazorpay().payments.refund(payment.providerPaymentId, { amount: amountPaise });
  } catch (e) {
    console.error("refundOrder: Razorpay refund failed", order.orderNumber, e);
    throw new AdminError("Razorpay could not process the refund. Nothing was changed - please try again.");
  }
  await recordRefund({ razorpayPaymentId: payment.providerPaymentId, refundedPaise: payment.refundedPaise + amountPaise });
  await logAudit(actor, { action: "order.refund", entity: "Order", entityId: id, summary: `${order.orderNumber}: refunded ${amountPaise} paise`, diff: { amountPaise } });
  await sendRefundEmail(id, amountPaise).catch((e) => console.error("refund email failed", e));
}
