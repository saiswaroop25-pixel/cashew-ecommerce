import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL } from "@/components/orders/order-details";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function OrdersPage() {
  const profile = await requireUser();
  const orders = await prisma.order.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, orderNumber: true, status: true, totalPaise: true, createdAt: true },
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-soft">
        <p className="text-chocolate">You have not placed any orders yet.</p>
        <Link href="/shop" className="mt-3 inline-block text-forest underline">Start shopping</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id}>
         <Link href={`/account/orders/${o.id}`} className="flex items-center justify-between rounded-card bg-white p-5 shadow-soft hover:ring-1 hover:ring-gold">
          <div>
            <p className="font-serif text-lg text-chocolate">{o.orderNumber}</p>
            <p className="text-xs text-brown">{o.createdAt.toLocaleDateString("en-IN")}</p>
          </div>
          <div className="text-right">
            <p className="text-brown">{formatINR(o.totalPaise)}</p>
            <p className="text-xs uppercase tracking-widest text-gold">{STATUS_LABEL[o.status] ?? o.status}</p>
          </div>
         </Link>
        </li>
      ))}
    </ul>
  );
}
