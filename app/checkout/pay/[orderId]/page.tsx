import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PayButton } from "@/components/checkout/pay-button";
import { OrderDetails, STATUS_LABEL } from "@/components/orders/order-details";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/dal";
import { getOrderForViewer } from "@/services/orders";
import { getSite } from "@/services/site";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
  // The URL carries an access token: keep it out of Referer headers sent to other sites.
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function PayPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Suspense fallback={<p className="text-brown">Loading your order…</p>}>
        <Body {...props} />
      </Suspense>
    </main>
  );
}

async function Body({ params, searchParams }: Props) {
  const [{ orderId }, sp, user] = await Promise.all([params, searchParams, getSessionUser()]);
  const token = typeof sp.t === "string" ? sp.t : null;
  const [order, site] = await Promise.all([getOrderForViewer(orderId, token, user?.id ?? null), getSite()]);
  if (!order) notFound();

  const paid = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status);

  return (
    <>
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Order {order.orderNumber}</p>

      {order.status === "PENDING_PAYMENT" && (
        <>
          <h1 className="mt-2 font-serif text-4xl text-forest">Complete your payment</h1>
          <p className="mt-3 text-brown">Your items are held for a short time while you pay.</p>
          <div className="mt-6">
            <PayButton orderId={order.id} token={token} totalPaise={order.totalPaise} siteName={site.name} />
          </div>
        </>
      )}

      {paid && (
        <>
          <h1 className="mt-2 font-serif text-4xl text-forest">Thank you – payment received</h1>
          <p className="mt-3 text-brown">
            Status: <strong className="text-chocolate">{STATUS_LABEL[order.status]}</strong>. A confirmation email is on its way to {order.email}.
          </p>
        </>
      )}

      {order.status === "CANCELLED" && (
        <>
          <h1 className="mt-2 font-serif text-4xl text-forest">This order has expired</h1>
          <p className="mt-3 text-brown">It was not paid in time, so the items were released. No money was taken.</p>
          <LinkButton href="/shop" className="mt-4">Back to the shop</LinkButton>
        </>
      )}

      {order.status === "REFUNDED" && (
        <>
          <h1 className="mt-2 font-serif text-4xl text-forest">This order was refunded</h1>
          <p className="mt-3 text-brown">Your refund has been issued to the original payment method. Banks usually take 5–7 working days to show it.</p>
        </>
      )}

      <div className="mt-8">
        <OrderDetails order={order} />
      </div>
    </>
  );
}
