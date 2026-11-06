import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteProduct } from "@/components/admin/delete-product";
import { ProductForm, type ProductDefaults } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { paiseToRupeesString } from "@/lib/admin/text";
import { requireAdmin } from "@/lib/auth/dal";
import { getAdminProduct, getProductFormOptions } from "@/services/admin/products";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, options] = await Promise.all([getAdminProduct(id), getProductFormOptions()]);
  if (!product) notFound();

  const defaults: ProductDefaults = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    form: product.form,
    grade: product.grade,
    shortDescription: product.shortDescription ?? "",
    description: product.description,
    origin: product.origin ?? "",
    ingredients: product.ingredients ?? "",
    allergenInfo: product.allergenInfo ?? "",
    storageInstruction: product.storageInstruction ?? "",
    deliveryInfo: product.deliveryInfo ?? "",
    nutritionProfileId: product.nutritionProfileId ?? "",
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      weightGrams: String(v.weightGrams),
      price: paiseToRupeesString(v.priceInPaise),
      compareAt: v.compareAtPaise ? paiseToRupeesString(v.compareAtPaise) : "",
      sku: v.sku,
      quantity: String(v.inventory?.quantity ?? 0),
      lowStockThreshold: String(v.inventory?.lowStockThreshold ?? 10),
      isActive: v.isActive,
      reserved: v.inventory?.reserved ?? 0,
    })),
  };

  return (
    <>
      <Link href="/admin/products" className="text-sm text-forest underline">← All products</Link>
      <div className="mt-3">
        <PageHeader
          title={product.name}
          subtitle={product.isDemo ? "Demo product - replace its details with real information before launch." : undefined}
          actions={product.isActive ? <Link href={`/products/${product.slug}`} className="text-sm text-forest underline" target="_blank" rel="noopener noreferrer">View in shop ↗</Link> : undefined}
        />
      </div>
      {sp.created === "1" && <p role="status" className="mb-4 rounded-lg bg-forest/10 px-4 py-3 text-sm text-forest">Product created.</p>}
      <ProductForm defaults={defaults} options={options} />
      <section className="mt-10 rounded-card border border-red-200 bg-white p-6">
        <h2 className="font-serif text-xl text-red-800">Danger zone</h2>
        <div className="mt-3"><DeleteProduct id={product.id} /></div>
      </section>
    </>
  );
}
