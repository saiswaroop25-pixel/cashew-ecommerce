import { describe, expect, it } from "vitest";
import {
  FLAT_SHIPPING_PAISE,
  FREE_SHIPPING_THRESHOLD_PAISE,
  clampQuantity,
  computeTotals,
  evaluateCoupon,
  type CouponRule,
} from "@/lib/pricing";

const NOW = new Date("2026-06-15T12:00:00Z");
const coupon = (o: Partial<CouponRule> = {}): CouponRule => ({
  code: "TEST10", type: "PERCENT", value: 10, minOrderPaise: 0, maxUses: null, usedCount: 0,
  startsAt: null, expiresAt: null, isActive: true, ...o,
});

describe("computeTotals", () => {
  it("sums lines and adds flat shipping under the threshold", () => {
    const t = computeTotals([{ unitPricePaise: 30_000, quantity: 2 }]);
    expect(t).toMatchObject({ subtotalPaise: 60_000, shippingPaise: FLAT_SHIPPING_PAISE, totalPaise: 66_000 });
    expect(t.freeShippingRemainingPaise).toBe(FREE_SHIPPING_THRESHOLD_PAISE - 60_000);
  });
  it("gives free shipping at the threshold", () => {
    const t = computeTotals([{ unitPricePaise: FREE_SHIPPING_THRESHOLD_PAISE, quantity: 1 }]);
    expect(t.shippingPaise).toBe(0);
    expect(t.freeShippingRemainingPaise).toBe(0);
  });
  it("applies the free-shipping test after the discount", () => {
    const t = computeTotals([{ unitPricePaise: 100_000, quantity: 1 }], 5_000);
    expect(t.shippingPaise).toBe(FLAT_SHIPPING_PAISE); // 95,000 < 99,900
    expect(t.totalPaise).toBe(95_000 + FLAT_SHIPPING_PAISE);
  });
  it("has no shipping or totals for an empty cart", () => {
    expect(computeTotals([])).toMatchObject({ subtotalPaise: 0, shippingPaise: 0, totalPaise: 0 });
  });
  it("never lets a discount exceed the subtotal or go negative", () => {
    expect(computeTotals([{ unitPricePaise: 10_000, quantity: 1 }], 999_999).discountPaise).toBe(10_000);
    expect(computeTotals([{ unitPricePaise: 10_000, quantity: 1 }], -5).discountPaise).toBe(0);
  });
});

describe("evaluateCoupon", () => {
  it("computes percent discounts, rounding down", () => {
    expect(evaluateCoupon(coupon(), 33_333, NOW)).toEqual({ ok: true, discountPaise: 3_333 });
  });
  it("caps fixed discounts at the subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 50_000 }), 20_000, NOW)).toEqual({ ok: true, discountPaise: 20_000 });
  });
  it.each([
    ["missing", null],
    ["inactive", coupon({ isActive: false })],
    ["not started", coupon({ startsAt: new Date("2026-07-01") })],
    ["expired", coupon({ expiresAt: new Date("2026-06-01") })],
    ["used up", coupon({ maxUses: 5, usedCount: 5 })],
    ["below minimum", coupon({ minOrderPaise: 50_000 })],
  ])("rejects a %s coupon", (_n, c) => {
    expect(evaluateCoupon(c, 10_000, NOW).ok).toBe(false);
  });
  it("accepts a coupon exactly at its minimum order", () => {
    expect(evaluateCoupon(coupon({ minOrderPaise: 10_000 }), 10_000, NOW).ok).toBe(true);
  });
});

describe("clampQuantity", () => {
  it.each([[0, 1], [-3, 1], [2.9, 2], [999, 20], [NaN, 1]])("%s -> %s", (input, expected) => {
    expect(clampQuantity(input)).toBe(expected);
  });
});
