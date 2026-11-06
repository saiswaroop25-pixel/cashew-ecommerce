import { describe, expect, it } from "vitest";
import { canAdvance, canRefund, cancelKind, nextFulfilmentStatus, validateRefundAmount, type OrderStatus } from "@/lib/orders/transitions";

const ALL: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

describe("fulfilment progression", () => {
  it("moves one step at a time: PAID -> PROCESSING -> SHIPPED -> DELIVERED", () => {
    expect(nextFulfilmentStatus("PAID")).toBe("PROCESSING");
    expect(nextFulfilmentStatus("PROCESSING")).toBe("SHIPPED");
    expect(nextFulfilmentStatus("SHIPPED")).toBe("DELIVERED");
  });
  it("has no next step from unpaid, delivered, cancelled or refunded orders", () => {
    for (const s of ["PENDING_PAYMENT", "DELIVERED", "CANCELLED", "REFUNDED"] as const) expect(nextFulfilmentStatus(s)).toBeNull();
  });
  it("allows ONLY the single next step (no skipping, no going backwards)", () => {
    const allowed = new Set(["PAID>PROCESSING", "PROCESSING>SHIPPED", "SHIPPED>DELIVERED"]);
    for (const from of ALL) for (const to of ALL) expect(canAdvance(from, to)).toBe(allowed.has(`${from}>${to}`));
  });
});

describe("cancelling", () => {
  it("releases stock for unpaid orders, refunds+restocks for paid ones that have not shipped", () => {
    expect(cancelKind("PENDING_PAYMENT")).toBe("release-stock");
    expect(cancelKind("PAID")).toBe("refund-and-restock");
    expect(cancelKind("PROCESSING")).toBe("refund-and-restock");
  });
  it("cannot cancel once shipped, delivered, or already finished", () => {
    for (const s of ["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const) expect(cancelKind(s)).toBeNull();
  });
});

describe("refunds", () => {
  it("is possible for paid orders with money left, never for unpaid/cancelled/refunded", () => {
    for (const s of ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const) expect(canRefund(s, 10000, 0)).toBe(true);
    for (const s of ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"] as const) expect(canRefund(s, 10000, 0)).toBe(false);
  });
  it("is not possible once fully refunded", () => {
    expect(canRefund("DELIVERED", 10000, 10000)).toBe(false);
    expect(canRefund("DELIVERED", 10000, 4000)).toBe(true);
  });
  it("validates the amount", () => {
    expect(validateRefundAmount(5000, 10000, 0)).toBeNull();
    expect(validateRefundAmount(6000, 10000, 5000)).not.toBeNull(); // only 5000 left
    expect(validateRefundAmount(5000, 10000, 5000)).toBeNull(); // exactly what is left
    for (const bad of [0, -1, 1.5, NaN]) expect(validateRefundAmount(bad, 10000, 0)).not.toBeNull();
  });
});
