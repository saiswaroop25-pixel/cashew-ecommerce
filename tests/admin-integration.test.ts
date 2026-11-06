// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration tests for the admin services against the REAL development database.
 *  - Only rows created here (unique prefix) are ever touched or deleted; your real data is left alone.
 *  - Razorpay and email are mocked: no real refund, no real email can ever be triggered by a test run.
 */

const rz = vi.hoisted(() => ({ failRefunds: false, refunds: [] as { paymentId: string; amount: number }[] }));
const mail = vi.hoisted(() => ({ shipped: 0, refund: 0, quotation: 0 }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/services/email", () => ({
  sendShippedEmail: async () => void mail.shipped++,
  sendRefundEmail: async () => void mail.refund++,
  sendQuotationEmail: async () => void mail.quotation++,
  sendOrderPaidEmails: async () => {},
  sendBulkEnquiryEmails: async () => {},
  sendEmail: async () => true,
}));
vi.mock("@/services/payments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/payments")>();
  return {
    ...actual,
    getRazorpay: () => ({
      payments: {
        refund: async (paymentId: string, opts: { amount: number }) => {
          if (rz.failRefunds) throw new Error("razorpay down");
          rz.refunds.push({ paymentId, amount: opts.amount });
          return { id: "rfnd_test" };
        },
      },
    }),
  };
});

import { prisma } from "@/lib/prisma";
import { productSchema, type ProductInput } from "@/lib/validators/admin-product";
import { logAudit } from "@/services/admin/audit";
import { createQuotation, sendQuotation, updateEnquiry } from "@/services/admin/enquiries";
import { advanceOrder, cancelOrder, markShipped, refundOrder } from "@/services/admin/orders";
import { AdminError, deleteProduct, listAdminProducts, saveProduct, setProductActive } from "@/services/admin/products";
import { getDashboardStats } from "@/services/admin/stats";

const TAG = "zzt" + randomBytes(3).toString("hex");
const actor = { id: randomUUID(), email: `test-admin-${TAG}@example.test` };
let categoryId = "";

const baseProduct = (over: Partial<Record<string, unknown>> = {}, variants?: unknown[]) =>
  productSchema.parse({
    name: `Test Product ${TAG}`,
    slug: `${TAG}-prod`,
    categoryId,
    form: "RAW",
    grade: "W240",
    description: "A product created by the automated test suite.",
    variants: variants ?? [{ label: "250 g", weightGrams: 250, price: "299.50", sku: `${TAG}-250`, quantity: 10, lowStockThreshold: 3, isActive: true }],
    ...over,
  }) as ProductInput;

async function mkProduct(slugSuffix: string, qty = 10) {
  const p = await saveProduct(
    baseProduct({ name: `Test ${slugSuffix}`, slug: `${TAG}-${slugSuffix}` }, [{ label: "250 g", weightGrams: 250, price: "100", sku: `${TAG}-${slugSuffix}-250`, quantity: qty }]),
    null,
    actor,
  );
  const variant = await prisma.productVariant.findFirstOrThrow({ where: { productId: p.id }, include: { inventory: true } });
  return { product: p, variant };
}

let orderSeq = 0;
async function mkOrder(variantId: string, status: "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED", qty = 2, unit = 10000) {
  const n = ++orderSeq;
  const total = unit * qty;
  const order = await prisma.order.create({
    data: {
      orderNumber: `ZZT-${TAG}-${n}`.toUpperCase(),
      accessToken: randomBytes(12).toString("hex"),
      status,
      email: "buyer@example.test",
      customerName: "Test Buyer",
      phone: "9876543210",
      shipLine1: "1 Test St",
      shipCity: "Testville",
      shipState: "Karnataka",
      shipPostal: "575001",
      subtotalPaise: total,
      totalPaise: total,
      items: { create: [{ variantId, productName: "Test", variantLabel: "250 g", sku: "SKU", unitPricePaise: unit, quantity: qty, lineTotalPaise: total }] },
      ...(status !== "PENDING_PAYMENT" && {
        payments: { create: [{ providerOrderId: `order_${TAG}${n}`, providerPaymentId: `pay_${TAG}${n}`, status: "SUCCEEDED", amountPaise: total }] },
      }),
    },
  });
  return order;
}

const inv = async (variantId: string) => (await prisma.inventory.findUniqueOrThrow({ where: { variantId } }));
const orderStatus = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

beforeAll(async () => {
  categoryId = (await prisma.category.findFirstOrThrow()).id;
});

beforeEach(() => {
  rz.failRefunds = false;
  rz.refunds.length = 0;
  mail.shipped = mail.refund = mail.quotation = 0;
});

afterAll(async () => {
  // Remove ONLY what this run created.
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: `ZZT-${TAG}`.toUpperCase() } } });
  await prisma.bulkEnquiry.deleteMany({ where: { reference: { startsWith: `ZZT-${TAG}`.toUpperCase() } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.auditLog.deleteMany({ where: { actorEmail: actor.email } });
  await prisma.$disconnect();
});

/* ───────────────────────── Products ───────────────────────── */

describe("products", () => {
  it("creates a product with pack sizes and stock, priced in exact paise", async () => {
    const p = await saveProduct(baseProduct(), null, actor);
    const v = await prisma.productVariant.findFirstOrThrow({ where: { productId: p.id }, include: { inventory: true } });
    expect(v.priceInPaise).toBe(29950);
    expect(v.sku).toBe(`${TAG}-250`.toUpperCase());
    expect(v.inventory).toMatchObject({ quantity: 10, lowStockThreshold: 3, reserved: 0 });
    expect(p.isDemo).toBe(false);
  });

  it("rejects a duplicate slug and a duplicate SKU with readable messages", async () => {
    await expect(saveProduct(baseProduct(), null, actor)).rejects.toThrow(AdminError); // same slug as above
    await expect(
      saveProduct(baseProduct({ slug: `${TAG}-other` }), null, actor),
    ).rejects.toThrow(/SKU|web address/);
  });

  it("updating keeps order history safe: omitted pack sizes are deactivated, not deleted", async () => {
    const { product, variant } = await mkProduct("upd");
    const input = baseProduct({ slug: `${TAG}-upd`, name: "Renamed" }, [
      { id: variant.id, label: "250 g", weightGrams: 250, price: "120", sku: `${TAG}-upd-250`, quantity: 25 },
      { label: "500 g", weightGrams: 500, price: "220", sku: `${TAG}-upd-500`, quantity: 5 },
    ]);
    await saveProduct(input, product.id, actor);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).priceInPaise).toBe(12000);
    expect((await inv(variant.id)).quantity).toBe(25);

    // now drop the 250 g pack from the form
    await saveProduct(baseProduct({ slug: `${TAG}-upd` }, [{ label: "500 g", weightGrams: 500, price: "220", sku: `${TAG}-upd-500`, quantity: 5, id: (await prisma.productVariant.findFirstOrThrow({ where: { sku: `${TAG}-upd-500`.toUpperCase() } })).id }]), product.id, actor);
    const dropped = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(dropped.isActive).toBe(false); // still exists
  });

  it("refuses to set stock below the units reserved by unpaid orders", async () => {
    const { product, variant } = await mkProduct("res", 10);
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { reserved: 4 } });
    const input = baseProduct({ slug: `${TAG}-res` }, [{ id: variant.id, label: "250 g", weightGrams: 250, price: "100", sku: `${TAG}-res-250`, quantity: 3 }]);
    await expect(saveProduct(input, product.id, actor)).rejects.toThrow(/currently held/);
    expect((await inv(variant.id)).quantity).toBe(10); // unchanged
  });

  it("cannot delete a product that appears in past orders, but can deactivate it; a never-ordered product can be deleted", async () => {
    const { product, variant } = await mkProduct("del");
    await mkOrder(variant.id, "PAID");
    await expect(deleteProduct(product.id, actor)).rejects.toThrow(/Deactivate/);
    await setProductActive(product.id, false, actor);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).isActive).toBe(false);

    const fresh = await mkProduct("del2");
    await deleteProduct(fresh.product.id, actor);
    expect(await prisma.product.findUnique({ where: { id: fresh.product.id } })).toBeNull();
  });

  it("admin list can search by SKU and filter by status", async () => {
    const { product } = await mkProduct("srch");
    const bySku = await listAdminProducts({ q: `${TAG}-srch-250` });
    expect(bySku.map((p) => p.id)).toContain(product.id);
    await setProductActive(product.id, false, actor);
    expect((await listAdminProducts({ q: `${TAG}-srch`, status: "active" })).map((p) => p.id)).not.toContain(product.id);
    expect((await listAdminProducts({ q: `${TAG}-srch`, status: "inactive" })).map((p) => p.id)).toContain(product.id);
  });
});

/* ───────────────────────── Orders ───────────────────────── */

describe("order fulfilment", () => {
  it("moves one step at a time and refuses to skip or go backwards", async () => {
    const { variant } = await mkProduct("flow");
    const o = await mkOrder(variant.id, "PAID");
    await expect(advanceOrder(o.id, "DELIVERED", actor)).rejects.toThrow(AdminError); // PAID -> DELIVERED not allowed
    await advanceOrder(o.id, "PROCESSING", actor);
    expect(await orderStatus(o.id)).toBe("PROCESSING");
    await expect(advanceOrder(o.id, "PROCESSING", actor)).rejects.toThrow(AdminError); // not twice
  });

  it("shipping needs a processing order, records tracking, emails the customer, then delivery completes it", async () => {
    const { variant } = await mkProduct("ship");
    const paid = await mkOrder(variant.id, "PAID");
    const ship = { carrier: "Delhivery", trackingNumber: "DL123456", trackingUrl: "https://track.example.test/DL123456" };
    await expect(markShipped(paid.id, ship, actor)).rejects.toThrow(AdminError); // must be PROCESSING first

    const o = await mkOrder(variant.id, "PROCESSING");
    await markShipped(o.id, ship, actor);
    expect(await orderStatus(o.id)).toBe("SHIPPED");
    expect(await prisma.shipment.findUniqueOrThrow({ where: { orderId: o.id } })).toMatchObject({ carrier: "Delhivery", trackingNumber: "DL123456", status: "IN_TRANSIT" });
    expect(mail.shipped).toBe(1);

    await advanceOrder(o.id, "DELIVERED", actor);
    expect(await orderStatus(o.id)).toBe("DELIVERED");
    expect((await prisma.shipment.findUniqueOrThrow({ where: { orderId: o.id } })).deliveredAt).not.toBeNull();
  });

  it("two admins clicking at once: exactly one wins (row lock), the other gets a clear error", async () => {
    const { variant } = await mkProduct("race");
    const o = await mkOrder(variant.id, "PAID");
    const results = await Promise.allSettled([advanceOrder(o.id, "PROCESSING", actor), advanceOrder(o.id, "PROCESSING", actor)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await orderStatus(o.id)).toBe("PROCESSING");
  });
});

describe("cancel and refund", () => {
  it("cancelling an UNPAID order releases its reserved stock and calls no refund", async () => {
    const { variant } = await mkProduct("cu", 10);
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { reserved: 2 } });
    const o = await mkOrder(variant.id, "PENDING_PAYMENT", 2);
    await cancelOrder(o.id, actor);
    expect(await orderStatus(o.id)).toBe("CANCELLED");
    expect(await inv(variant.id)).toMatchObject({ quantity: 10, reserved: 0 });
    expect(rz.refunds).toHaveLength(0);
  });

  it("cancelling a PAID order refunds the full amount first, then restocks and marks it refunded", async () => {
    const { variant } = await mkProduct("cp", 8); // 10 originally, 2 already sold
    const o = await mkOrder(variant.id, "PAID", 2, 15000);
    await cancelOrder(o.id, actor);
    expect(rz.refunds).toEqual([{ paymentId: expect.stringContaining("pay_"), amount: 30000 }]);
    expect(await orderStatus(o.id)).toBe("REFUNDED");
    expect((await inv(variant.id)).quantity).toBe(10); // 8 + 2 put back
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: o.id } })).status).toBe("REFUNDED");
    expect(mail.refund).toBe(1);
  });

  it("if Razorpay fails, NOTHING changes (no cancel, no restock)", async () => {
    const { variant } = await mkProduct("cf", 8);
    const o = await mkOrder(variant.id, "PAID", 2);
    rz.failRefunds = true;
    await expect(cancelOrder(o.id, actor)).rejects.toThrow(/NOT cancelled/);
    expect(await orderStatus(o.id)).toBe("PAID");
    expect((await inv(variant.id)).quantity).toBe(8);
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: o.id } })).refundedPaise).toBe(0);
  });

  it("shipped and delivered orders cannot be cancelled", async () => {
    const { variant } = await mkProduct("cs");
    for (const s of ["SHIPPED", "DELIVERED"] as const) {
      const o = await mkOrder(variant.id, s);
      await expect(cancelOrder(o.id, actor)).rejects.toThrow(/cannot be cancelled/);
      expect(await orderStatus(o.id)).toBe(s);
    }
    expect(rz.refunds).toHaveLength(0);
  });

  it("partial refunds accumulate, cannot exceed what was paid, and complete the order as REFUNDED", async () => {
    const { variant } = await mkProduct("pr");
    const o = await mkOrder(variant.id, "DELIVERED", 1, 10000);
    await refundOrder(o.id, 4000, actor);
    expect(await orderStatus(o.id)).toBe("DELIVERED"); // partial: still delivered
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: o.id } })).status).toBe("PARTIALLY_REFUNDED");
    await expect(refundOrder(o.id, 7000, actor)).rejects.toThrow(/more than/); // only 6000 left
    await expect(refundOrder(o.id, 0, actor)).rejects.toThrow(AdminError);
    await refundOrder(o.id, 6000, actor);
    expect(await orderStatus(o.id)).toBe("REFUNDED");
    expect(rz.refunds.map((r) => r.amount)).toEqual([4000, 6000]);
    await expect(refundOrder(o.id, 100, actor)).rejects.toThrow(AdminError); // nothing left
  });

  it("refunding an unpaid order is refused", async () => {
    const { variant } = await mkProduct("ru");
    const o = await mkOrder(variant.id, "PENDING_PAYMENT");
    await expect(refundOrder(o.id, 100, actor)).rejects.toThrow(AdminError);
    expect(rz.refunds).toHaveLength(0);
  });
});

/* ───────────────────────── Dashboard ───────────────────────── */

describe("dashboard stats", () => {
  it("counts a paid order in sales but not an unpaid one, and lists low-stock packs", async () => {
    const { variant } = await mkProduct("stat", 2); // 2 in stock, threshold default 10 -> low
    const before = await getDashboardStats();
    await mkOrder(variant.id, "PENDING_PAYMENT", 1, 7777);
    const afterPending = await getDashboardStats();
    expect(afterPending.totalSalesPaise).toBe(before.totalSalesPaise); // unpaid money is not revenue
    expect(afterPending.ordersAwaitingPayment).toBe(before.ordersAwaitingPayment + 1);

    await mkOrder(variant.id, "PAID", 1, 12345);
    const after = await getDashboardStats();
    expect(after.totalSalesPaise).toBe(before.totalSalesPaise + 12345);
    expect(after.ordersToFulfil).toBe(before.ordersToFulfil + 1);
    expect(after.lowStock.some((l) => l.sku === `${TAG}-stat-250`.toUpperCase())).toBe(true);
  });
});

/* ───────────────────────── Enquiries & quotations ───────────────────────── */

describe("enquiries and quotations", () => {
  async function mkEnquiry(n: number) {
    return prisma.bulkEnquiry.create({
      data: { reference: `ZZT-${TAG}-E${n}`.toUpperCase(), fullName: "Buyer", companyName: "Co", email: "buyer@example.test", phone: "9876543210", location: "Mumbai", variety: "RAW", quantityKg: 500 },
    });
  }

  it("saving a draft sends nothing; sending moves the enquiry to QUOTED and emails once", async () => {
    const e = await mkEnquiry(1);
    const input = { pricePerKgPaise: 75000, quantityKg: 500, validUntil: null, terms: "Net 15" };
    const draft = await createQuotation(e.id, input, false, actor);
    expect(draft.status).toBe("DRAFT");
    expect(mail.quotation).toBe(0);
    expect((await prisma.bulkEnquiry.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("NEW");

    await sendQuotation(draft.id, actor);
    expect(mail.quotation).toBe(1);
    expect((await prisma.quotation.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("SENT");
    expect((await prisma.bulkEnquiry.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("QUOTED");
    await expect(sendQuotation(draft.id, actor)).rejects.toThrow(/draft/); // cannot send twice
  });

  it("does not drag a CONVERTED enquiry back to QUOTED", async () => {
    const e = await mkEnquiry(2);
    await updateEnquiry(e.id, { status: "CONVERTED", adminNotes: "won" }, actor);
    await createQuotation(e.id, { pricePerKgPaise: 70000, quantityKg: 100, validUntil: null, terms: null }, true, actor);
    expect((await prisma.bulkEnquiry.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("CONVERTED");
  });

  it("status and notes update; unknown enquiry gives a clean error", async () => {
    const e = await mkEnquiry(3);
    await updateEnquiry(e.id, { status: "CONTACTED", adminNotes: "called, will revert" }, actor);
    expect(await prisma.bulkEnquiry.findUniqueOrThrow({ where: { id: e.id } })).toMatchObject({ status: "CONTACTED", adminNotes: "called, will revert" });
    await expect(updateEnquiry("does-not-exist", { status: "NEW", adminNotes: null }, actor)).rejects.toThrow(AdminError);
  });
});

/* ───────────────────────── Audit log ───────────────────────── */

describe("audit log", () => {
  it("records who did what, and a logging failure never throws", async () => {
    expect(await prisma.auditLog.count({ where: { actorEmail: actor.email, action: "product.create" } })).toBeGreaterThan(0);
    expect(await prisma.auditLog.count({ where: { actorEmail: actor.email, action: "order.refund" } })).toBeGreaterThan(0);
    expect(await prisma.auditLog.count({ where: { actorEmail: actor.email, action: "order.cancel" } })).toBeGreaterThan(0);
    // invalid actor id (not a uuid) makes the insert fail; logAudit must swallow it
    await expect(logAudit({ id: "not-a-uuid", email: "x@example.test" }, { action: "x", entity: "X" })).resolves.toBeUndefined();
  });
});
