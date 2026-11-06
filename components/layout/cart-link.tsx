import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { getCartCount } from "@/services/cart";

/** Reads the cart cookie/session, so it must be rendered inside <Suspense>. */
export async function CartLink() {
  const count = await getCartCount();
  return (
    <Link href="/cart" aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`} className="relative inline-flex p-2 text-chocolate hover:text-forest">
      <ShoppingBag size={20} aria-hidden />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] text-cream">
          {count}
        </span>
      )}
    </Link>
  );
}
