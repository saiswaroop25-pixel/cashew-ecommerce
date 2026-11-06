import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductInput } from "@/lib/validators/admin-product";
import { logAudit, type Actor } from "@/services/admin/audit";

export class AdminError extends Error {}

/** Turn database unique-constraint errors into messages an admin can act on. */
function friendly(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    // With the pg driver adapter the violated constraint is nested inside `meta` (e.g. "ProductVariant_sku_key"),
    // not in `meta.target` - so search the whole meta object for the constraint name.
    const target = JSON.stringify(e.meta ?? {});
    if (target.includes("slug")) throw new AdminError("Another product already uses this web address (slug). Change the name or the slug.");
    if (target.includes("sku")) throw new AdminError("Another pack size already uses one of these SKUs. SKUs must be unique.");
    if (target.includes("weightGrams")) throw new AdminError("This product already has a pack size with that weight.");
    throw new AdminError("That value is already in use.");
  }
  throw e;
}

/* ───────────────────────── Reading ───────────────────────── */

export async function listAdminProducts(args: { q?: string; status?: "all" | "active" | "inactive" } = {}) {
  const rows = await prisma.product.findMany({
    where: {
      ...(args.status === "active" && { isActive: true }),
      ...(args.status === "inactive" && { isActive: false }),
      ...(args.q && {
        OR: [
          { name: { contains: args.q, mode: "insensitive" } },
          { slug: { contains: args.q, mode: "insensitive" } },
          { variants: { some: { sku: { contains: args.q, mode: "insensitive" } } } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } }, variants: { include: { inventory: true } } },
  });
  return rows.map((p) => {
    const active = p.variants.filter((v) => v.isActive);
    const available = active.map((v) => (v.inventory ? v.inventory.quantity - v.inventory.reserved : 0));
    const low = active.some((v) => v.inventory && v.inventory.quantity - v.inventory.reserved <= v.inventory.lowStockThreshold);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category.name,
      form: p.form,
      grade: p.grade,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isDemo: p.isDemo,
      packs: active.length,
      totalAvailable: available.reduce((a, b) => a + b, 0),
      lowStock: low,
      fromPricePaise: active.length ? Math.min(...active.map((v) => v.priceInPaise)) : 0,
    };
  });
}

export async function getProductFormOptions() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return { categories };
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { weightGrams: "asc" }, include: { inventory: true } },
    },
  });
}

/* ───────────────────────── Writing ───────────────────────── */

const productData = (p: ProductInput) => ({
  name: p.name,
  slug: p.slug,
  categoryId: p.categoryId,
  form: p.form,
  grade: p.grade,
  shortDescription: p.shortDescription,
  description: p.description,
  origin: p.origin,
  ingredients: p.ingredients,
  allergenInfo: p.allergenInfo,
  storageInstruction: p.storageInstruction,
  deliveryInfo: p.deliveryInfo,
  isFeatured: p.isFeatured,
  isActive: p.isActive,
  seoTitle: p.seoTitle,
  seoDescription: p.seoDescription,
});

/**
 * Creates (id = null) or updates a product together with its pack sizes and stock, in one transaction.
 *  - Pack sizes omitted from an update are DEACTIVATED, never deleted: past orders and carts still reference them.
 *  - Stock cannot be set below the units currently reserved by unpaid orders.
 */
export async function saveProduct(input: ProductInput, id: string | null, actor: Actor) {
  try {
    const product = await prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.product.update({ where: { id }, data: productData(input) })
        : await tx.product.create({ data: { ...productData(input), isDemo: false } });

      const existing = await tx.productVariant.findMany({ where: { productId: saved.id }, include: { inventory: true } });
      const existingById = new Map(existing.map((v) => [v.id, v]));
      const keep = new Set<string>();

      for (const v of input.variants) {
        const common = {
          label: v.label,
          weightGrams: v.weightGrams,
          sku: v.sku.toUpperCase(),
          priceInPaise: v.price,
          compareAtPaise: v.compareAt,
          isActive: v.isActive,
        };
        if (v.id) {
          const current = existingById.get(v.id);
          if (!current) throw new AdminError("A pack size you edited no longer belongs to this product. Reload and try again.");
          const reserved = current.inventory?.reserved ?? 0;
          if (v.quantity < reserved) {
            throw new AdminError(`"${v.label}": stock cannot be lower than the ${reserved} unit(s) currently held by unpaid orders.`);
          }
          await tx.productVariant.update({ where: { id: v.id }, data: common });
          await tx.inventory.upsert({
            where: { variantId: v.id },
            update: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
            create: { variantId: v.id, quantity: v.quantity, lowStockThreshold: v.lowStockThreshold },
          });
          keep.add(v.id);
        } else {
          const created = await tx.productVariant.create({
            data: { ...common, productId: saved.id, inventory: { create: { quantity: v.quantity, lowStockThreshold: v.lowStockThreshold } } },
          });
          keep.add(created.id);
        }
      }
      const dropped = existing.filter((v) => !keep.has(v.id) && v.isActive).map((v) => v.id);
      if (dropped.length) await tx.productVariant.updateMany({ where: { id: { in: dropped } }, data: { isActive: false } });
      return saved;
    });

    await logAudit(actor, {
      action: id ? "product.update" : "product.create",
      entity: "Product",
      entityId: product.id,
      summary: `${id ? "Updated" : "Created"} "${product.name}" (${input.variants.length} pack size${input.variants.length === 1 ? "" : "s"})`,
    });
    return product;
  } catch (e) {
    return friendly(e);
  }
}

export async function setProductActive(id: string, isActive: boolean, actor: Actor) {
  const p = await prisma.product.update({ where: { id }, data: { isActive }, select: { id: true, name: true } });
  await logAudit(actor, { action: isActive ? "product.activate" : "product.deactivate", entity: "Product", entityId: id, summary: `${isActive ? "Activated" : "Deactivated"} "${p.name}"` });
  return p;
}

/** Permanent delete, only allowed when no order has ever been placed for the product. */
export async function deleteProduct(id: string, actor: Actor) {
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!product) throw new AdminError("That product no longer exists.");
  const ordered = await prisma.orderItem.count({ where: { variant: { productId: id } } });
  if (ordered > 0) throw new AdminError("This product appears in past orders, so it cannot be deleted. Deactivate it instead - it will disappear from the shop but keep your order history intact.");
  await prisma.product.delete({ where: { id } });
  await logAudit(actor, { action: "product.delete", entity: "Product", entityId: id, summary: `Deleted "${product.name}"` });
}
