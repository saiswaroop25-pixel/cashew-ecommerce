import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader, Pager, tableClasses } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { ENQUIRY_LABELS, ENQUIRY_STATUSES, listAdminEnquiries, type EnquiryStatus } from "@/services/admin/enquiries";

export const metadata: Metadata = { title: "Bulk enquiries" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminEnquiries({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = ENQUIRY_STATUSES.find((s) => s === one(sp.status));
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);
  const { enquiries, total, totalPages, page: current } = await listAdminEnquiries({ status, q, page });

  const chip = (label: string, value?: EnquiryStatus) => {
    const href = value ? `/admin/enquiries?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/admin/enquiries${q ? `?q=${encodeURIComponent(q)}` : ""}`;
    const active = value === status;
    return <Link key={label} href={href} aria-current={active ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-xs", active ? "border-forest bg-forest text-cream" : "border-cashew bg-white text-chocolate hover:border-forest")}>{label}</Link>;
  };

  return (
    <>
      <PageHeader title="Bulk enquiries" subtitle={`${total} enquir${total === 1 ? "y" : "ies"}`} />
      <div className="mb-4 flex flex-wrap gap-2">{chip("All")}{ENQUIRY_STATUSES.map((s) => chip(ENQUIRY_LABELS[s], s))}</div>
      <form method="get" className="mb-4 flex gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="q">Search enquiries</label>
        <input id="q" name="q" defaultValue={q} placeholder="Reference, company, name or email" className="min-w-56 flex-1 rounded-lg border border-cashew bg-white px-3 py-2 text-sm" />
        <Button type="submit" size="sm">Search</Button>
      </form>

      {enquiries.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No enquiries match.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Reference</th>
                <th scope="col" className={tableClasses.th}>Buyer</th>
                <th scope="col" className={tableClasses.th}>Requirement</th>
                <th scope="col" className={tableClasses.th}>Received</th>
                <th scope="col" className={tableClasses.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id} className={tableClasses.row}>
                  <td className={tableClasses.td}><Link href={`/admin/enquiries/${e.id}`} className="text-forest underline">{e.reference}</Link></td>
                  <td className={tableClasses.td}>{e.companyName}<br /><span className="text-xs text-brown">{e.fullName}</span></td>
                  <td className={tableClasses.td}>{e.quantityKg} kg · {e.variety}{e.grade && e.grade !== "ANY" ? ` · ${e.grade}` : ""}</td>
                  <td className={tableClasses.td}>{e.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className={tableClasses.td}><Badge value={e.status} label={ENQUIRY_LABELS[e.status as EnquiryStatus]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager basePath="/admin/enquiries" params={{ status, q }} page={current} totalPages={totalPages} />
    </>
  );
}
