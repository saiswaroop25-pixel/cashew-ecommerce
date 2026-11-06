import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetails, STATUS_LABEL } from "@/components/orders/order-details";
import { LinkButton } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [profile, { id }] = await Promise.all([requireUser(), params]);
  // profileId in the WHERE clause: you can only ever load your own orders.
  const order = await prisma.order.findFirst({
    where: { id, profileId: profile.id },
    include: { items: true, shipment: true },
  });
  if (!order) notFound();

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-forest underline">← All orders</Link>
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-gold">Order {order.orderNumber}</p>
      <h1 className="mt-1 font-serif text-3xl text-forest">{STATUS_LABEL[order.status] ?? order.status}</h1>
      <p className="mt-1 text-sm text-brown">Placed {order.createdAt.toLocaleDateString("en-IN")}</p>

      {order.status === "PENDING_PAYMENT" && (
        <LinkButton href={`/checkout/pay/${order.id}`} className="mt-4">Complete payment</LinkButton>
      )}
      {order.shipment?.trackingNumber && (
        <p className="mt-3 text-sm text-chocolate">
          Shipment: {order.shipment.carrier ?? "Carrier"} · {order.shipment.trackingNumber}
          {order.shipment.trackingUrl && <> · <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-forest underline">Track</a></>}
        </p>
      )}

      <div className="mt-6">
        <OrderDetails order={order} />
      </div>
    </div>
  );
}
