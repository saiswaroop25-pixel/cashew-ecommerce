import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, Pager, tableClasses } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/transitions";
import { cn, formatINR } from "@/lib/utils";
import { listAdminOrders } from "@/services/admin/orders";

export const metadata: Metadata = { title: "Orders" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export default async function AdminOrders({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const statusRaw = one(sp.status);
  const status = STATUSES.find((s) => s === statusRaw);
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const { orders, total, totalPages, page: current } = await listAdminOrders({ status, q, page });

  const chip = (label: string, value?: OrderStatus) => {
    const href = value ? `/admin/orders?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/admin/orders${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const active = value === status;
    return (
      <Link key={label} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-xs", active ? "border-forest bg-forest text-cream" : "border-cashew bg-white text-chocolate hover:border-forest")}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? "" : "s"}`} />
      <div className="mb-4 flex flex-wrap gap-2">{chip("All")}{STATUSES.map((s) => chip(STATUS_LABELS[s], s))}</div>

      <form method="get" className="mb-4 flex gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="q">Search orders</label>
        <input id="q" name="q" defaultValue={q} placeholder="Order number, name, email or phone" className="min-w-56 flex-1 rounded-lg border border-cashew bg-white px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Search</Button>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No orders match.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Order</th>
                <th scope="col" className={tableClasses.th}>Customer</th>
                <th scope="col" className={tableClasses.th}>Placed</th>
                <th scope="col" className={tableClasses.th}>Status</th>
                <th scope="col" className={`${tableClasses.th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={tableClasses.row}>
                  <td className={tableClasses.td}><Link href={`/admin/orders/${o.id}`} className="text-forest underline">{o.orderNumber}</Link></td>
                  <td className={tableClasses.td}>{o.customerName}<br /><span className="text-xs text-brown">{o.email}{o.profileId ? "" : " · guest"}</span></td>
                  <td className={tableClasses.td}>{o.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className={tableClasses.td}><Badge value={o.status} label={STATUS_LABELS[o.status as OrderStatus]} /></td>
                  <td className={`${tableClasses.td} text-right`}>{formatINR(o.totalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/orders" params={{ status, q }} page={current} totalPages={totalPages} />
    </>
  );
}
