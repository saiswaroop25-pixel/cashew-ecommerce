import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AddToCart } from "@/components/shop/add-to-cart";
import { ProductCard } from "@/components/shop/product-card";
import { GRADE_LABELS, type GRADES } from "@/lib/validators/catalog";
import { getSessionUser } from "@/lib/auth/dal";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { getProductBySlug, isProductWishlisted, listRelatedProducts } from "@/services/catalog";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default function ProductPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <Suspense fallback={<p className="text-brown">Loading product…</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, user] = await Promise.all([listRelatedProducts(product.id, product.category.slug), getSessionUser()]);
  const wishlisted = user ? await isProductWishlisted(user.id, product.id) : false;
  const grade = GRADE_LABELS[product.grade as (typeof GRADES)[number] | "NA"];
  const specs = (product.specifications ?? {}) as Record<string, string>;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-brown">
        <Link href="/shop" className="underline">Shop</Link> / {product.category.name}
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-card bg-cashew/40 text-brown/60">
          {product.images.length ? "Gallery (media phase)" : "Image coming soon"}
        </div>

        <div>
          {product.isDemo && (
            <p className="mb-3 inline-block rounded-full bg-chocolate/80 px-3 py-1 text-xs text-cream">
              Demo product – not real business data
            </p>
          )}
          <h1 className="font-serif text-4xl text-forest">{product.name}</h1>
          {grade !== "—" && <p className="mt-1 text-gold">Grade {grade}</p>}
          <p className="mt-4 text-chocolate">{product.description}</p>

          <div className="mt-8">
            <AddToCart
              options={product.variants.map((v) => ({
                id: v.id,
                label: v.label,
                priceInPaise: v.priceInPaise,
                compareAtPaise: v.compareAtPaise,
                inStock: v.inStock,
              }))}
            />
          </div>

          <div className="mt-5">
            <WishlistButton productId={product.id} saved={wishlisted} returnTo={`/products/${product.slug}`} />
          </div>

          <dl className="mt-8 space-y-4 text-sm">
            {product.storageInstruction && <Info label="Storage" value={product.storageInstruction} />}
            {product.deliveryInfo && <Info label="Delivery" value={product.deliveryInfo} />}
            {product.ingredients && <Info label="Ingredients" value={product.ingredients} />}
            {product.allergenInfo && <Info label="Allergens" value={product.allergenInfo} />}
            {Object.entries(specs).map(([k, v]) => <Info key={k} label={k} value={String(v)} />)}
          </dl>
        </div>
      </div>

      {product.nutritionProfile && (
        <section className="mt-14">
          <h2 className="font-serif text-2xl text-forest">Nutrition per {product.nutritionProfile.basisGrams} g</h2>
          <p className="mt-1 text-xs text-brown">
            Source ({product.nutritionProfile.sourceType.toLowerCase().replace("_", " ")}):{" "}
            {product.nutritionProfile.sourceNote}
          </p>
          <table className="mt-4 w-full max-w-md text-sm">
            <tbody>
              {product.nutritionProfile.values.map((n) => (
                <tr key={n.id} className="border-b border-cashew">
                  <th scope="row" className="py-2 text-left font-normal text-chocolate">{n.label}</th>
                  <td className="py-2 text-right text-brown">{n.amount.toString()} {n.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-serif text-2xl text-forest">You may also like</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
          </ul>
        </section>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-gold">{label}</dt>
      <dd className="text-chocolate">{value}</dd>
    </div>
  );
}
