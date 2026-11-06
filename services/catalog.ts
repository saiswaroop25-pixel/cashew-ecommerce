import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PAGE_SIZE, type CatalogQuery } from "@/lib/validators/catalog";

const listInclude = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  variants: {
    where: { isActive: true },
    orderBy: { weightGrams: "asc" },
    include: { inventory: true },
  },
} satisfies Prisma.ProductInclude;

type ListedProduct = Prisma.ProductGetPayload<{ include: typeof listInclude }>;

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  grade: string;
  form: string;
  categoryName: string;
  imageUrl: string | null;
  imageAlt: string | null;
  fromPricePaise: number;
  inStock: boolean;
  /** cheapest in-stock pack, used for the card's quick-add button */
  quickVariantId: string | null;
  quickVariantLabel: string | null;
  isDemo: boolean;
  popularity: number;
  createdAt: Date;
};

function available(v: { inventory: { quantity: number; reserved: number } | null }) {
  return v.inventory ? v.inventory.quantity - v.inventory.reserved > 0 : false;
}

function summarise(p: ListedProduct): ProductSummary {
  const prices = p.variants.map((v) => v.priceInPaise);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    grade: p.grade,
    form: p.form,
    categoryName: p.category.name,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    fromPricePaise: prices.length ? Math.min(...prices) : 0,
    inStock: p.variants.some(available),
    quickVariantId: p.variants.find(available)?.id ?? null,
    quickVariantLabel: p.variants.find(available)?.label ?? null,
    isDemo: p.isDemo,
    popularity: p.popularity,
    createdAt: p.createdAt,
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });
}

/**
 * Filtered, sorted, paginated product list.
 * Price sort/filter depends on the cheapest *active variant*, which Prisma cannot
 * order by directly, so the (already DB-filtered) set is sorted in memory. That is
 * fine for a catalogue of up to a few hundred products; revisit with a SQL view or
 * a denormalised `fromPricePaise` column if the catalogue grows much larger.
 */
export async function listProducts(q: CatalogQuery) {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(q.category && { category: { slug: q.category } }),
    ...(q.form && { form: q.form }),
    ...(q.grade && { grade: q.grade }),
    ...(q.q && {
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { shortDescription: { contains: q.q, mode: "insensitive" } },
      ],
    }),
    ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
      variants: {
        some: {
          isActive: true,
          priceInPaise: {
            ...(q.minPrice !== undefined && { gte: q.minPrice * 100 }),
            ...(q.maxPrice !== undefined && { lte: q.maxPrice * 100 }),
          },
        },
      },
    }),
  };

  const rows = (await prisma.product.findMany({ where, include: listInclude })).map(summarise);
  const filtered = q.inStock ? rows.filter((r) => r.inStock) : rows;

  const sorters = {
    popular: (a: ProductSummary, b: ProductSummary) => b.popularity - a.popularity,
    newest: (a: ProductSummary, b: ProductSummary) => b.createdAt.getTime() - a.createdAt.getTime(),
    "price-asc": (a: ProductSummary, b: ProductSummary) => a.fromPricePaise - b.fromPricePaise,
    "price-desc": (a: ProductSummary, b: ProductSummary) => b.fromPricePaise - a.fromPricePaise,
  } as const;
  filtered.sort(sorters[q.sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(q.page, totalPages);
  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    page,
    totalPages,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: { weightGrams: "asc" },
        include: { inventory: true },
      },
    },
  });
  if (!product) return null;
  return {
    ...product,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: v.label,
      weightGrams: v.weightGrams,
      priceInPaise: v.priceInPaise,
      compareAtPaise: v.compareAtPaise,
      inStock: available(v),
    })),
  };
}

export async function listRelatedProducts(productId: string, categorySlug: string, limit = 4) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, id: { not: productId }, category: { slug: categorySlug } },
    include: listInclude,
    take: limit,
    orderBy: { popularity: "desc" },
  });
  return rows.map(summarise);
}

export async function listFeaturedProducts(limit = 4) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: listInclude,
    take: limit,
    orderBy: { popularity: "desc" },
  });
  return rows.map(summarise);
}

export async function listWishlistProducts(profileId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { wishlist: { profileId }, product: { isActive: true } },
    orderBy: { createdAt: "desc" },
    include: { product: { include: listInclude } },
  });
  return items.map((i) => summarise(i.product));
}

export async function isProductWishlisted(profileId: string, productId: string) {
  const n = await prisma.wishlistItem.count({ where: { productId, wishlist: { profileId } } });
  return n > 0;
}
