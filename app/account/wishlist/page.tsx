import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { LinkButton } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { listWishlistProducts } from "@/services/catalog";

export const metadata: Metadata = { title: "My wishlist", robots: { index: false } };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function WishlistPage() {
  const profile = await requireUser();
  const products = await listWishlistProducts(profile.id);
  if (products.length === 0) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-soft">
        <p className="text-chocolate">Your wishlist is empty.</p>
        <p className="mt-1 text-sm text-brown">Use “Add to wishlist” on any product page to save it here.</p>
        <LinkButton href="/shop" className="mt-4">Browse cashews</LinkButton>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {products.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
    </ul>
  );
}
