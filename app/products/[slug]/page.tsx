import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AddToCart } from "@/components/shop/add-to-cart";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductCard } from "@/components/shop/product-card";
import { GRADE_LABELS, type GRADES } from "@/lib/validators/catalog";
import { getSessionUser } from "@/lib/auth/dal";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { JsonLdScript } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { site } from "@/lib/site";
import { getProductBySlug, isProductWishlisted, listRelatedProducts } from "@/services/catalog";
import { listIndexableProducts, productSlugExists } from "@/services/seo";
import { getSite } from "@/services/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
    // Link previews (WhatsApp, Facebook, X) use the product's main photo when it has one
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.shortDescription ?? undefined,
      url: `/products/${product.slug}`,
      ...(product.images[0] ? { images: [{ url: product.images[0].url, alt: product.images[0].alt }] } : {}),
    },
  };
}

/** Known slugs are prerendered; unknown ones are rendered on demand (and 404 below). */
export async function generateStaticParams() {
  const products = await listIndexableProducts();
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

// Deliberately a blocking route: the product is looked up before anything streams so an unknown slug gets a real
// HTTP 404 (search engines treat a 200 "not found" page as a soft 404). Known products are still prerendered.
export const instant = false;

export default async function ProductPage({ params }: { params: Params }) {
  // Checked before anything streams, so an unknown product is a real 404 (not a 200 page saying "not found").
  const { slug } = await params;
  if (!(await productSlugExists(slug))) notFound();
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
  const company = await getSite();
  const productUrl = `${site.url}/products/${product.slug}`;
  const specs = (product.specifications ?? {}) as Record<string, string>;

  return (
    <>
      <JsonLdScript
        data={[
          productJsonLd({
            name: product.name,
            description: product.shortDescription ?? product.description,
            url: productUrl,
            images: product.images.map((i) => i.url),
            brand: company.name,
            category: product.category.name,
            variants: product.variants.map((v) => ({ sku: v.sku, pricePaise: v.priceInPaise, inStock: v.inStock })),
          }),
          breadcrumbJsonLd([
            { name: "Home", url: site.url },
            { name: "Shop", url: `${site.url}/shop` },
            { name: product.name, url: productUrl },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-brown">
        <Link href="/shop" className="underline">Shop</Link> / {product.category.name}
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery photos={product.images.map((i) => ({ url: i.url, alt: i.alt }))} productName={product.name} />

        <div>
          {product.isDemo && (
            <p className="mb-3 inline-block rounded-full bg-chocolate/80 px-3 py-1 text-xs text-cream">
              Demo product – not real business data
            </p>
          )}
          <h1 className="font-serif text-4xl text-forest">{product.name}</h1>
          {grade !== "—" && <p className="mt-1 text-gold-text">Grade {grade}</p>}
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
      <dt className="text-xs uppercase tracking-widest text-gold-text">{label}</dt>
      <dd className="text-chocolate">{value}</dd>
    </div>
  );
}
