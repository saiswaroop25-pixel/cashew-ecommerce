import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/shop/product-card";
import {
  FORMS,
  FORM_LABELS,
  GRADES,
  GRADE_LABELS,
  parseCatalogQuery,
  type CatalogQuery,
} from "@/lib/validators/catalog";
import { listCategories, listProducts } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Shop cashews",
  description: "Browse whole, raw, roasted, salted and broken cashews by grade and pack size.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">Shop</h1>
      <p className="mt-2 text-brown">Cashews by variety, grade and pack size.</p>
      {/* Reads request-time searchParams, so it must sit inside Suspense (cacheComponents). */}
      <Suspense fallback={<p className="mt-10 text-brown">Loading products…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const query = parseCatalogQuery(await searchParams);
  const [categories, result] = await Promise.all([listCategories(), listProducts(query)]);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
      <Filters query={query} categories={categories} />
      <section aria-live="polite">
        <p className="mb-4 text-sm text-brown">
          {result.total} {result.total === 1 ? "product" : "products"}
        </p>
        {result.items.length === 0 ? (
          <div className="rounded-card bg-white p-10 text-center shadow-soft">
            <p className="text-chocolate">No products match your filters.</p>
            <Link href="/shop" className="mt-3 inline-block text-forest underline">
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {result.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
        <Pagination query={query} page={result.page} totalPages={result.totalPages} />
      </section>
    </div>
  );
}

const field =
  "w-full rounded-lg border border-cashew bg-white px-3 py-2 text-sm text-chocolate";

/** Plain GET form: works without JavaScript and keeps filters in shareable URLs. */
function Filters({
  query,
  categories,
}: {
  query: CatalogQuery;
  categories: { name: string; slug: string }[];
}) {
  return (
    <form method="get" action="/shop" className="space-y-4 rounded-card bg-white p-5 shadow-soft lg:self-start">
      <label className="block text-sm">
        <span className="mb-1 block text-brown">Search</span>
        <input name="q" defaultValue={query.q} maxLength={80} className={field} placeholder="e.g. W240" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-brown">Category</span>
        <select name="category" defaultValue={query.category ?? ""} className={field}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-brown">Type</span>
        <select name="form" defaultValue={query.form ?? ""} className={field}>
          <option value="">All</option>
          {FORMS.map((f) => (
            <option key={f} value={f}>{FORM_LABELS[f]}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-brown">Grade</span>
        <select name="grade" defaultValue={query.grade ?? ""} className={field}>
          <option value="">All</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{GRADE_LABELS[g]}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>
          <span className="mb-1 block text-brown">Min ₹</span>
          <input name="minPrice" type="number" min={0} defaultValue={query.minPrice} className={field} />
        </label>
        <label>
          <span className="mb-1 block text-brown">Max ₹</span>
          <input name="maxPrice" type="number" min={0} defaultValue={query.maxPrice} className={field} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-chocolate">
        <input type="checkbox" name="inStock" value="1" defaultChecked={query.inStock === "1"} />
        In stock only
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-brown">Sort by</span>
        <select name="sort" defaultValue={query.sort} className={field}>
          <option value="popular">Popularity</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
      <div className="flex gap-3">
        <button type="submit" className="flex-1 rounded-full bg-forest px-4 py-2 text-sm text-cream">
          Apply
        </button>
        <Link href="/shop" className="rounded-full border border-forest px-4 py-2 text-sm text-forest">
          Reset
        </Link>
      </div>
    </form>
  );
}

function Pagination({ query, page, totalPages }: { query: CatalogQuery; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, page: p })) {
      if (v !== undefined && v !== "" && !(k === "page" && p === 1)) params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `/shop?${s}` : "/shop";
  };
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-sm">
      {page > 1 && <Link href={href(page - 1)} className="text-forest underline">Previous</Link>}
      <span className="text-brown">Page {page} of {totalPages}</span>
      {page < totalPages && <Link href={href(page + 1)} className="text-forest underline">Next</Link>}
    </nav>
  );
}
