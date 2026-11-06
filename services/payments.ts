import "server-only";
import Razorpay from "razorpay";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/* ───────────────────────── Razorpay client ───────────────────────── */

let client: Razorpay | undefined;
export function getRazorpay(): Razorpay {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay keys are not configured");
  client ??= new Razorpay({ key_id, key_secret });
  return client;
}

export class PaymentError extends Error {}

type Tx = Prisma.TransactionClient;

/** Serialise concurrent work on one order (checkout confirm, webhook, expiry job). */
async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
}

/* ───────────────────────── 1. Create a payment attempt ───────────────────────── */

export type CheckoutParams = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  orderNumber: string;
  prefill: { name: string; email: string; contact: string };
};

/**
 * Creates (or reuses) the Razorpay order for one of our PENDING_PAYMENT orders.
 * The amount is always our server-computed total – the browser never supplies it.
 * Reusing the same Razorpay order lets a customer retry after a failed attempt.
 */
export async function createCheckoutParams(orderId: string): Promise<CheckoutParams> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new PaymentError("Order not found.");
  if (order.status !== "PENDING_PAYMENT") throw new PaymentError("This order is not awaiting payment.");

  // Razorpay expects the country code, otherwise it asks the customer to type the number again.
  const contact = order.phone.startsWith("+") ? order.phone : `+91${order.phone}`;
  const prefill = { name: order.customerName, email: order.email, contact };
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!;

  const reusable = order.payments.find(
    (p) => p.providerOrderId && p.amountPaise === order.totalPaise && ["CREATED", "PENDING", "FAILED"].includes(p.status),
  );
  if (reusable?.providerOrderId) {
    return { keyId, razorpayOrderId: reusable.providerOrderId, amountPaise: order.totalPaise, currency: "INR", orderNumber: order.orderNumber, prefill };
  }

  const rzOrder = await getRazorpay().orders.create({
    amount: order.totalPaise,
    currency: "INR",
    receipt: order.orderNumber,
    notes: { orderId: order.id, orderNumber: order.orderNumber },
  });
  await prisma.payment.create({
    data: { orderId: order.id, providerOrderId: rzOrder.id, amountPaise: order.totalPaise, status: "CREATED" },
  });
  return { keyId, razorpayOrderId: rzOrder.id, amountPaise: order.totalPaise, currency: "INR", orderNumber: order.orderNumber, prefill };
}

/* ───────────────────────── 2. Mark a payment successful (idempotent) ───────────────────────── */

export type FinalizeResult =
  | { kind: "paid"; orderId: string; firstTime: boolean }
  | { kind: "paid_late_refunded"; orderId: string }
  | { kind: "amount_mismatch"; orderId: string }
  | { kind: "unknown_order" };

const PAID_STATES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED"] as const;

class OutOfStockOnLatePayment extends Error {}

/**
 * Called by BOTH the browser confirm step and the webhook, in any order, any number
 * of times. A row lock + state check makes it safe: the first caller moves the order
 * to PAID and converts reserved stock into sold stock; later callers change nothing.
 */
export async function finalizePaymentSuccess(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise?: number;
  method?: string | null;
  raw?: Prisma.InputJsonValue;
}): Promise<FinalizeResult> {
  const { razorpayOrderId, razorpayPaymentId, amountPaise, method, raw } = args;

  const payment = await prisma.payment.findUnique({ where: { providerOrderId: razorpayOrderId } });
  if (!payment) return { kind: "unknown_order" };

  try {
    return await prisma.$transaction(async (tx): Promise<FinalizeResult> => {
      await lockOrder(tx, payment.orderId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });

      // A payment whose amount differs from the order total is never accepted.
      if (amountPaise !== undefined && amountPaise !== order.totalPaise) {
        await tx.payment.update({
          where: { id: current.id },
          data: { status: "FAILED", failureReason: `Amount mismatch: paid ${amountPaise}, expected ${order.totalPaise}` },
        });
        return { kind: "amount_mismatch", orderId: order.id };
      }

      if ((PAID_STATES as readonly string[]).includes(order.status)) {
        return { kind: "paid", orderId: order.id, firstTime: false }; // already processed
      }

      if (order.status === "CANCELLED") {
        // Paid after the order expired and its stock was released: try to take the stock again.
        for (const item of order.items) {
          if (!item.variantId) continue;
          const n = await tx.$executeRaw`
            UPDATE "Inventory" SET "quantity" = "quantity" - ${item.quantity}
             WHERE "variantId" = ${item.variantId} AND "quantity" - "reserved" >= ${item.quantity}`;
          if (n === 0) throw new OutOfStockOnLatePayment();
        }
      } else {
        // Normal path: reserved stock becomes sold stock.
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.$executeRaw`
            UPDATE "Inventory"
               SET "quantity" = "quantity" - ${item.quantity},
                   "reserved" = GREATEST("reserved" - ${item.quantity}, 0)
             WHERE "variantId" = ${item.variantId}`;
        }
      }

      await tx.payment.update({
        where: { id: current.id },
        data: { status: "SUCCEEDED", providerPaymentId: razorpayPaymentId, method: method ?? current.method, failureReason: null, rawEvent: raw },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
      return { kind: "paid", orderId: order.id, firstTime: true };
    });
  } catch (e) {
    if (!(e instanceof OutOfStockOnLatePayment)) throw e;
    // Money was taken but we cannot fulfil: refund automatically.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", providerPaymentId: razorpayPaymentId, failureReason: "Paid after the order expired and stock ran out – refunding" },
    });
    await refundPayment(razorpayPaymentId, payment.amountPaise).catch((err) => console.error("late-payment refund failed – REFUND MANUALLY", razorpayPaymentId, err));
    return { kind: "paid_late_refunded", orderId: payment.orderId };
  }
}

/** Full refund through Razorpay, then reflect it locally. */
export async function refundPayment(razorpayPaymentId: string, amountPaise: number) {
  await getRazorpay().payments.refund(razorpayPaymentId, { amount: amountPaise });
  await recordRefund({ razorpayPaymentId, refundedPaise: amountPaise });
}

/* ───────────────────────── 3. Failures & refunds ───────────────────────── */

export async function recordPaymentFailure(args: { razorpayOrderId: string; razorpayPaymentId?: string; reason?: string }) {
  const payment = await prisma.payment.findUnique({ where: { providerOrderId: args.razorpayOrderId }, include: { order: true } });
  if (!payment) return;
  // Never downgrade a paid order because a *different attempt* failed.
  if ((PAID_STATES as readonly string[]).includes(payment.order.status) || payment.status === "SUCCEEDED") return;
  await prisma.payment
    .update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: args.reason?.slice(0, 300) ?? "Payment failed", providerPaymentId: args.razorpayPaymentId ?? payment.providerPaymentId },
    })
    .catch((e) => console.error("recordPaymentFailure", e));
  // The order stays PENDING_PAYMENT so the customer can retry until it expires.
}

export async function recordRefund(args: { razorpayPaymentId: string; refundedPaise: number }) {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId: args.razorpayPaymentId } });
  if (!payment) return;
  await prisma.$transaction(async (tx) => {
    await lockOrder(tx, payment.orderId);
    const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const refunded = Math.min(fresh.amountPaise, Math.max(fresh.refundedPaise, args.refundedPaise));
    const full = refunded >= fresh.amountPaise;
    await tx.payment.update({ where: { id: fresh.id }, data: { refundedPaise: refunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (full) await tx.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
  });
}

/* ───────────────────────── 4. Verify with Razorpay's API (capture if needed) ───────────────────────── */

/**
 * After the browser reports success, ask Razorpay directly (authenticated) what the payment is.
 * Guards against a forged/replayed callback and captures payments left only "authorized".
 */
export async function fetchVerifiedPayment(razorpayOrderId: string, razorpayPaymentId: string, expectedAmountPaise: number) {
  const rz = getRazorpay();
  let p = await rz.payments.fetch(razorpayPaymentId);
  if (p.order_id !== razorpayOrderId) throw new PaymentError("Payment does not belong to this order.");
  if (Number(p.amount) !== expectedAmountPaise) throw new PaymentError("Payment amount does not match the order.");
  if (p.status === "authorized") p = await rz.payments.capture(razorpayPaymentId, expectedAmountPaise, "INR");
  if (p.status !== "captured") throw new PaymentError(`Payment is not complete (status: ${p.status}).`);
  return { method: typeof p.method === "string" ? p.method : null, amountPaise: Number(p.amount) };
}

/* ───────────────────────── 5. Expire abandoned orders ───────────────────────── */

/**
 * Cancels PENDING_PAYMENT orders older than `olderThanMinutes` and releases their reserved stock.
 * Before cancelling, asks Razorpay whether the order was actually paid (e.g. webhook not delivered yet).
 */
export async function expirePendingOrders(olderThanMinutes = 30): Promise<{ cancelled: number; recovered: number }> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    include: { payments: true },
    take: 100,
  });

  let cancelled = 0;
  let recovered = 0;
  for (const order of stale) {
    // Was it paid after all?
    let paidId: string | null = null;
    for (const p of order.payments) {
      if (!p.providerOrderId) continue;
      try {
        const list = await getRazorpay().orders.fetchPayments(p.providerOrderId);
        const hit = list.items?.find((i: { status: string }) => i.status === "captured");
        if (hit) {
          const r = await finalizePaymentSuccess({ razorpayOrderId: p.providerOrderId, razorpayPaymentId: hit.id, amountPaise: Number(hit.amount), method: hit.method ?? null });
          if (r.kind === "paid") paidId = hit.id;
        }
      } catch (e) {
        console.error("expire: could not check Razorpay order", p.providerOrderId, e);
      }
    }
    if (paidId) { recovered++; continue; }

    const done = await prisma.$transaction(async (tx) => {
      await lockOrder(tx, order.id);
      const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      if (fresh.status !== "PENDING_PAYMENT") return false; // changed while we were checking
      for (const item of fresh.items) {
        if (!item.variantId) continue;
        await tx.$executeRaw`UPDATE "Inventory" SET "reserved" = GREATEST("reserved" - ${item.quantity}, 0) WHERE "variantId" = ${item.variantId}`;
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: { in: ["CREATED", "PENDING", "FAILED"] } },
        data: { status: "FAILED", failureReason: "Order expired before payment" },
      });
      return true;
    });
    if (done) cancelled++;
  }
  return { cancelled, recovered };
}
