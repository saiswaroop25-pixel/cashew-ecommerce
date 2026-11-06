import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, StatCard, tableClasses } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/transitions";
import { formatINR } from "@/lib/utils";
import { getDashboardStats } from "@/services/admin/stats";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireAdmin();
  const s = await getDashboardStats();

  return (
    <>
      <PageHeader title="Overview" subtitle="How the shop is doing right now." />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total sales" value={formatINR(s.totalSalesPaise)} hint="Paid orders, before refunds" />
        <StatCard label="Orders" value={String(s.totalOrders)} hint="Completed checkouts" href="/admin/orders" />
        <StatCard label="To fulfil" value={String(s.ordersToFulfil)} hint="Paid or processing" href="/admin/orders?status=PAID" tone={s.ordersToFulfil > 0 ? "warn" : "default"} />
        <StatCard label="Delivered" value={String(s.ordersCompleted)} href="/admin/orders?status=DELIVERED" />
        <StatCard label="Awaiting payment" value={String(s.ordersAwaitingPayment)} hint="Stock is held for these" href="/admin/orders?status=PENDING_PAYMENT" />
        <StatCard label="Customers" value={String(s.customers)} />
        <StatCard label="New bulk enquiries" value={String(s.newEnquiries)} href="/admin/enquiries?status=NEW" tone={s.newEnquiries > 0 ? "warn" : "default"} />
        <StatCard label="Low-stock packs" value={String(s.lowStock.length)} href="/admin/products" tone={s.lowStock.length > 0 ? "warn" : "default"} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-3 font-serif text-xl text-forest">Recent orders</h2>
          {s.recentOrders.length === 0 ? (
            <p className="rounded-card bg-white p-6 text-sm text-brown shadow-soft">No orders yet.</p>
          ) : (
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <tbody>
                  {s.recentOrders.map((o) => (
                    <tr key={o.id} className={tableClasses.row}>
                      <td className={tableClasses.td}>
                        <Link href={`/admin/orders/${o.id}`} className="text-forest underline">{o.orderNumber}</Link>
                        <br />
                        <span className="text-xs text-brown">{o.customerName}</span>
                      </td>
                      <td className={tableClasses.td}><Badge value={o.status} label={STATUS_LABELS[o.status as OrderStatus]} /></td>
                      <td className={`${tableClasses.td} text-right`}>{formatINR(o.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="low-h">
          <h2 id="low-h" className="mb-3 font-serif text-xl text-forest">Low stock</h2>
          {s.lowStock.length === 0 ? (
            <p className="rounded-card bg-white p-6 text-sm text-brown shadow-soft">Every pack size is above its low-stock level.</p>
          ) : (
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <tbody>
                  {s.lowStock.map((l) => (
                    <tr key={l.sku} className={tableClasses.row}>
                      <td className={tableClasses.td}>
                        <Link href="/admin/products" className="text-forest underline">{l.name}</Link>
                        <br />
                        <span className="text-xs text-brown">{l.label} · {l.sku}</span>
                      </td>
                      <td className={`${tableClasses.td} text-right`}>
                        <span className={l.available <= 0 ? "text-red-700" : "text-chocolate"}>{l.available} left</span>
                        <br />
                        <span className="text-xs text-brown">alert at {l.threshold}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
