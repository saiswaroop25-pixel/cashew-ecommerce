import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, Pager, tableClasses } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatINR } from "@/lib/utils";
import { listCustomers } from "@/services/admin/customers";

export const metadata: Metadata = { title: "Customers" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminCustomersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const { customers, total, totalPages, page: current } = await listCustomers({ q, page });

  return (
    <>
      <PageHeader title="Customers" subtitle={`${total} registered account${total === 1 ? "" : "s"}. Guest checkouts appear under Orders only.`} />
      <form method="get" className="mb-4 flex gap-3">
        <label className="sr-only" htmlFor="q">Search customers</label>
        <input id="q" name="q" defaultValue={q} placeholder="Name, email or phone" className="min-w-56 flex-1 rounded-lg border border-cashew bg-white px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Search</Button>
      </form>

      {customers.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No customers match.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Customer</th>
                <th scope="col" className={tableClasses.th}>Phone</th>
                <th scope="col" className={tableClasses.th}>Joined</th>
                <th scope="col" className={`${tableClasses.th} text-right`}>Paid orders</th>
                <th scope="col" className={`${tableClasses.th} text-right`}>Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    {c.fullName ?? <span className="text-brown/70">No name</span>} {c.role === "ADMIN" && <Badge value="PROCESSING" label="Admin" />}
                    <br /><span className="text-xs text-brown">{c.email}</span>
                  </td>
                  <td className={tableClasses.td}>{c.phone ?? "–"}</td>
                  <td className={tableClasses.td}>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className={`${tableClasses.td} text-right`}>
                    {c.paidOrders > 0 ? <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="text-forest underline">{c.paidOrders}</Link> : "0"}
                  </td>
                  <td className={`${tableClasses.td} text-right`}>{formatINR(c.spentPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/customers" params={{ q }} page={current} totalPages={totalPages} />
    </>
  );
}
