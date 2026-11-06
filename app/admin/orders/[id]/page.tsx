import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvanceForm, CancelForm, RefundForm, ShipForm } from "@/components/admin/order-actions";
import { Badge, PageHeader } from "@/components/admin/ui";
import { OrderSummary } from "@/components/cart/order-summary";
import { paiseToRupeesString } from "@/lib/admin/text";
import { requireAdmin } from "@/lib/auth/dal";
import { STATUS_LABELS, canRefund, cancelKind, nextFulfilmentStatus, type OrderStatus } from "@/lib/orders/transitions";
import { formatINR } from "@/lib/utils";
import { getAdminOrder } from "@/services/admin/orders";

export const metadata: Metadata = { title: "Order" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const payment = order.payments.find((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED");
  const next = nextFulfilmentStatus(status);
  const cancel = cancelKind(status);
  const remaining = payment ? payment.amountPaise - payment.refundedPaise : 0;
  const refundable = !!payment && canRefund(status, payment.amountPaise, payment.refundedPaise);

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-forest underline">← All orders</Link>
      <div className="mt-3">
        <PageHeader title={order.orderNumber} subtitle={`Placed ${order.createdAt.toLocaleString("en-IN")}`} actions={<Badge value={status} label={STATUS_LABELS[status]} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-card bg-white p-6 shadow-soft" aria-labelledby="items-h">
            <h2 id="items-h" className="font-serif text-xl text-forest">Items</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>{i.productName} <span className="text-brown">({i.variantLabel}) × {i.quantity}</span><br /><span className="text-xs text-brown">{i.sku}</span></span>
                  <span className="text-brown">{formatINR(i.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-cashew pt-4">
              <OrderSummary totals={{ subtotalPaise: order.subtotalPaise, discountPaise: order.discountPaise, shippingPaise: order.shippingPaise, totalPaise: order.totalPaise, freeShippingRemainingPaise: 0 }} couponCode={order.coupon?.code} />
            </div>
          </section>

          <section className="rounded-card bg-white p-6 text-sm shadow-soft" aria-labelledby="cust-h">
            <h2 id="cust-h" className="font-serif text-xl text-forest">Customer &amp; delivery</h2>
            <p className="mt-3 text-chocolate">{order.customerName}</p>
            <p className="text-brown">{order.email} · {order.phone}</p>
            <p className="text-xs text-brown">{order.profile ? `Account: ${order.profile.email}` : "Guest checkout"}</p>
            <address className="mt-3 not-italic text-brown">
              {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}<br />{order.shipCity}, {order.shipState} {order.shipPostal}
            </address>
            {order.notes && <p className="mt-3 rounded-lg bg-cashew/40 p-3 text-chocolate"><strong>Customer note:</strong> {order.notes}</p>}
          </section>

          <section className="rounded-card bg-white p-6 text-sm shadow-soft" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-serif text-xl text-forest">Payments</h2>
            {order.payments.length === 0 ? (
              <p className="mt-3 text-brown">No payment attempts yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="rounded-lg border border-cashew p-3">
                    <p className="flex items-center justify-between"><span>{formatINR(p.amountPaise)} via {p.method ?? p.provider}</span><Badge value={p.status === "SUCCEEDED" ? "PAID" : p.status === "FAILED" ? "CANCELLED" : p.status === "REFUNDED" ? "REFUNDED" : "PENDING_PAYMENT"} label={p.status.replace("_", " ").toLowerCase()} /></p>
                    <p className="mt-1 break-all text-xs text-brown">Razorpay order {p.providerOrderId ?? "–"}{p.providerPaymentId ? ` · payment ${p.providerPaymentId}` : ""}</p>
                    {p.refundedPaise > 0 && <p className="text-xs text-brown">Refunded {formatINR(p.refundedPaise)}</p>}
                    {p.failureReason && <p className="text-xs text-red-700">{p.failureReason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {status === "PAID" && next && (
            <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Next step</h2><AdvanceForm id={order.id} to="PROCESSING" label="Start processing" /></section>
          )}
          {status === "PROCESSING" && (
            <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Ship this order</h2><ShipForm id={order.id} /></section>
          )}
          {status === "SHIPPED" && (
            <>
              <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Shipment</h2>
                <ShipForm id={order.id} existing={{ carrier: order.shipment?.carrier ?? "", trackingNumber: order.shipment?.trackingNumber ?? "", trackingUrl: order.shipment?.trackingUrl ?? "" }} />
              </section>
              <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Delivered?</h2><AdvanceForm id={order.id} to="DELIVERED" label="Mark as delivered" /></section>
            </>
          )}
          {status === "DELIVERED" && order.shipment && (
            <section className="rounded-card bg-white p-5 text-sm shadow-soft"><h2 className="mb-2 font-serif text-lg text-forest">Shipment</h2><p className="text-brown">{order.shipment.carrier} · {order.shipment.trackingNumber}</p></section>
          )}
          {refundable && (
            <section className="rounded-card bg-white p-5 shadow-soft"><h2 className="mb-3 font-serif text-lg text-forest">Refund</h2><RefundForm id={order.id} remainingRupees={paiseToRupeesString(remaining)} /></section>
          )}
          {cancel && (
            <section className="rounded-card border border-red-200 bg-white p-5"><h2 className="mb-3 font-serif text-lg text-red-800">Cancel</h2><CancelForm id={order.id} kind={cancel} /></section>
          )}
          {(status === "CANCELLED" || status === "REFUNDED") && <p className="rounded-card bg-white p-5 text-sm text-brown shadow-soft">This order is finished. No further actions are available.</p>}
        </aside>
      </div>
    </>
  );
}
