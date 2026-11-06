"use client";

import { Heart } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setWishlisted } from "@/app/actions/wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, saved, returnTo }: { productId: string; saved: boolean; returnTo: string }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await setWishlisted(productId, !optimistic, returnTo);
        })
      }
      className="inline-flex items-center gap-2 rounded-full border border-cashew bg-white px-4 py-2 text-sm text-chocolate hover:border-forest disabled:opacity-60"
    >
      <Heart size={16} aria-hidden className={cn(optimistic && "fill-gold text-gold")} />
      {optimistic ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
