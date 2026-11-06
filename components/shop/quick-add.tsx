"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

/** Adds one of the cheapest in-stock pack to the cart. */
export function QuickAdd({ variantId, label, productName }: { variantId: string | null; label: string | null; productName: string }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  if (!variantId) {
    return <Button type="button" size="sm" variant="outline" disabled className="w-full">Out of stock</Button>;
  }
  return (
    <div>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending}
        aria-label={`Add ${label ?? ""} to cart, ${productName}`.replace("Add  to","Add to")}
        onClick={() =>
          start(async () => {
            const res = await addToCart(variantId, 1);
            setStatus({ ok: res.ok, text: res.ok ? "Added to cart" : (res.message ?? "Could not add") });
          })
        }
      >
        {pending ? "Adding…" : `Add ${label ?? ""} to cart`}
      </Button>
      <p role="status" className={`mt-1 min-h-4 text-center text-xs ${status?.ok ? "text-forest" : "text-red-700"}`}>
        {status?.text}
      </p>
    </div>
  );
}
