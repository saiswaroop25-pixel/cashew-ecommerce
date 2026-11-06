/**
 * Pure pricing rules. All amounts are integer paise. The server recomputes totals
 * from database prices on every cart view and at order creation – amounts sent
 * by the browser are never trusted.
 */

export const MAX_QTY_PER_LINE = 20;

/**
 * DEMO shipping rule – placeholder until the business confirms real rates
 * (later: admin-editable settings / Shiprocket-Delhivery rate lookup).
 */
export const FREE_SHIPPING_THRESHOLD_PAISE = 99_900; // ₹999
export const FLAT_SHIPPING_PAISE = 6_000; // ₹60

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number; // percent (1-100) or paise
  minOrderPaise: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export type CouponResult =
  | { ok: true; discountPaise: number }
  | { ok: false; reason: string };

export function evaluateCoupon(coupon: CouponRule | null, subtotalPaise: number, now: Date): CouponResult {
  if (!coupon || !coupon.isActive) return { ok: false, reason: "This coupon code is not valid." };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "This coupon is not active yet." };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, reason: "This coupon has expired." };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "This coupon has reached its usage limit." };
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    return { ok: false, reason: `Add items worth ₹${Math.ceil((coupon.minOrderPaise - subtotalPaise) / 100)} more to use this coupon.` };
  }
  const raw = coupon.type === "PERCENT" ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
  // Never discount more than the goods total.
  return { ok: true, discountPaise: Math.max(0, Math.min(raw, subtotalPaise)) };
}

export type Totals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  /** paise still needed for free shipping, 0 if already free or cart empty */
  freeShippingRemainingPaise: number;
};

export function computeTotals(
  lines: { unitPricePaise: number; quantity: number }[],
  discountPaise = 0,
): Totals {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const discount = Math.min(Math.max(discountPaise, 0), subtotalPaise);
  const afterDiscount = subtotalPaise - discount;
  const shippingPaise = subtotalPaise === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : FLAT_SHIPPING_PAISE;
  return {
    subtotalPaise,
    discountPaise: discount,
    shippingPaise,
    totalPaise: afterDiscount + shippingPaise,
    freeShippingRemainingPaise:
      subtotalPaise === 0 ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - afterDiscount),
  };
}

export function clampQuantity(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.trunc(q)));
}
