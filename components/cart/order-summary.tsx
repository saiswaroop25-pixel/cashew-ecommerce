import { FREE_SHIPPING_THRESHOLD_PAISE, type Totals } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export function OrderSummary({ totals, couponCode }: { totals: Totals; couponCode?: string | null }) {
  const progress = Math.min(100, Math.round(((FREE_SHIPPING_THRESHOLD_PAISE - totals.freeShippingRemainingPaise) / FREE_SHIPPING_THRESHOLD_PAISE) * 100));
  return (
    <div>
      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={formatINR(totals.subtotalPaise)} />
        {totals.discountPaise > 0 && (
          <Row label={couponCode ? `Discount (${couponCode})` : "Discount"} value={`− ${formatINR(totals.discountPaise)}`} accent />
        )}
        <Row label="Shipping" value={totals.shippingPaise === 0 ? "Free" : formatINR(totals.shippingPaise)} />
        <div className="flex justify-between border-t border-cashew pt-3 font-serif text-xl text-chocolate">
          <dt>Total</dt>
          <dd>{formatINR(totals.totalPaise)}</dd>
        </div>
      </dl>
      {totals.subtotalPaise > 0 && totals.freeShippingRemainingPaise > 0 && (
        <div className="mt-4">
          <p className="text-xs text-brown">Add {formatINR(totals.freeShippingRemainingPaise)} more for free shipping</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cashew" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
            <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-brown">Prices are in INR. The total shown is the amount you pay, with no extra charges.</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brown">{label}</dt>
      <dd className={accent ? "text-forest" : "text-chocolate"}>{value}</dd>
    </div>
  );
}
