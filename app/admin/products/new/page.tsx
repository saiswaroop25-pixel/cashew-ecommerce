import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth/dal";
import { getProductFormOptions } from "@/services/admin/products";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const options = await getProductFormOptions();
  return (
    <>
      <Link href="/admin/products" className="text-sm text-forest underline">← All products</Link>
      <div className="mt-3"><PageHeader title="New product" /></div>
      <ProductForm defaults={EMPTY_PRODUCT} options={options} />
    </>
  );
}
