import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Visible products for the sitemap. Cached, and refreshed immediately when an admin changes a product (tag "products"). */
export async function listIndexableProducts(): Promise<{ slug: string; updatedAt: Date }[]> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  return prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 });
}

/**
 * Cheap, cached "does a visible product with this slug exist?" check. The product page runs it BEFORE anything is
 * streamed, so unknown product URLs get a genuine HTTP 404 (search engines treat 200 + "not found" text as a soft 404).
 * Refreshed immediately when an admin changes a product (tag "products").
 */
export async function productSlugExists(slug: string): Promise<boolean> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  return (await prisma.product.count({ where: { slug, isActive: true } })) > 0;
}
