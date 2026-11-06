import type { Metadata } from "next";
import Link from "next/link";
import { setProductActiveAction } from "@/app/actions/admin/products";
import { Badge, PageHeader, tableClasses } from "@/components/admin/ui";
import { Button, LinkButton } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { formatINR } from "@/lib/utils";
import { FORM_LABELS, GRADE_LABELS, type FORMS, type GRADES } from "@/lib/validators/catalog";
import { listAdminProducts } from "@/services/admin/products";

export const metadata: Metadata = { title: "Products" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AdminProducts({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim().slice(0, 80) || undefined;
  const statusRaw = one(sp.status);
  const status = statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
  const products = await listAdminProducts({ q, status });

  return (
    <>
      <PageHeader title="Products" subtitle={`${products.length} product${products.length === 1 ? "" : "s"}`} actions={<LinkButton href="/admin/products/new">New product</LinkButton>} />
      {one(sp.deleted) === "1" && <p role="status" className="mb-4 rounded-lg bg-forest/10 px-4 py-3 text-sm text-forest">Product deleted.</p>}

      <form method="get" className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="q">Search products</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, slug or SKU" className="min-w-56 flex-1 rounded-lg border border-cashew bg-white px-3 py-2 text-sm" />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status} className="rounded-lg border border-cashew bg-white px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Visible</option>
          <option value="inactive">Hidden</option>
        </select>
        <Button type="submit" size="sm">Filter</Button>
      </form>

      {products.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-brown shadow-soft">No products match.</p>
      ) : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.head}>
              <tr>
                <th scope="col" className={tableClasses.th}>Product</th>
                <th scope="col" className={tableClasses.th}>Type / grade</th>
                <th scope="col" className={tableClasses.th}>Packs</th>
                <th scope="col" className={tableClasses.th}>In stock</th>
                <th scope="col" className={tableClasses.th}>From</th>
                <th scope="col" className={tableClasses.th}>Status</th>
                <th scope="col" className={tableClasses.th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={tableClasses.row}>
                  <td className={tableClasses.td}>
                    <Link href={`/admin/products/${p.id}`} className="text-forest underline">{p.name}</Link>
                    {p.isDemo && <span className="ml-2 rounded-full bg-chocolate/80 px-2 py-0.5 text-[10px] text-cream">Demo</span>}
                    {p.isFeatured && <span className="ml-2 rounded-full bg-gold/40 px-2 py-0.5 text-[10px] text-chocolate">Featured</span>}
                    <br /><span className="text-xs text-brown">{p.category}</span>
                  </td>
                  <td className={tableClasses.td}>{FORM_LABELS[p.form as (typeof FORMS)[number]] ?? p.form}{p.grade !== "NA" ? ` · ${GRADE_LABELS[p.grade as (typeof GRADES)[number]] ?? p.grade}` : ""}</td>
                  <td className={tableClasses.td}>{p.packs}</td>
                  <td className={tableClasses.td}>
                    {p.totalAvailable}
                    {p.lowStock && <span className="ml-2 rounded-full bg-gold/40 px-2 py-0.5 text-[10px] text-chocolate">Low</span>}
                  </td>
                  <td className={tableClasses.td}>{p.packs ? formatINR(p.fromPricePaise) : "–"}</td>
                  <td className={tableClasses.td}><Badge value={p.isActive ? "ACTIVE" : "INACTIVE"} label={p.isActive ? "Visible" : "Hidden"} /></td>
                  <td className={`${tableClasses.td} text-right`}>
                    <form action={setProductActiveAction} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(!p.isActive)} />
                      <Button type="submit" variant="ghost" size="sm">{p.isActive ? "Hide" : "Show"}</Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
