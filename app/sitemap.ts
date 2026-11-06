import type { MetadataRoute } from "next";
import { legalPages } from "@/lib/legal";
import { site } from "@/lib/site";
import { listIndexableProducts } from "@/services/seo";

/** Public, indexable pages only. Private areas (account, cart, checkout, admin) are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listIndexableProducts();
  const base = site.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/bulk-orders`, changeFrequency: "monthly", priority: 0.7 },
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...legalPages.map((p) => ({ url: `${base}/legal/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
