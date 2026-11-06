import Image from "next/image";
import Link from "next/link";
import { QuickAdd } from "@/components/shop/quick-add";
import { formatINR } from "@/lib/utils";
import { GRADE_LABELS, type GRADES } from "@/lib/validators/catalog";
import type { ProductSummary } from "@/services/catalog";

export function ProductCard({ product }: { product: ProductSummary }) {
  const grade = GRADE_LABELS[product.grade as (typeof GRADES)[number] | "NA"];
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-soft transition-transform duration-300 hover:-translate-y-1">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
      <div className="relative aspect-square bg-cashew/40">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brown">
            Image coming soon
          </div>
        )}
        {product.isDemo && (
          <span className="absolute left-3 top-3 rounded-full bg-chocolate/80 px-2.5 py-1 text-xs text-cream">
            Demo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs uppercase tracking-widest text-gold-text">
          {product.categoryName}
          {grade !== "—" && ` · ${grade}`}
        </p>
        <h3 className="font-serif text-lg leading-snug text-chocolate">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-brown">From {formatINR(product.fromPricePaise)}</span>
          <span className={product.inStock ? "text-xs text-forest" : "text-xs text-brown"}>
            {product.inStock ? "In stock" : "Out of stock"}
          </span>
        </div>
      </div>
      </Link>
      <div className="px-4 pb-4">
        <QuickAdd variantId={product.quickVariantId} label={product.quickVariantLabel} productName={product.name} />
      </div>
    </div>
  );
}
