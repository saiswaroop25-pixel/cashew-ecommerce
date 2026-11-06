"use client";

import { Minus, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";

export type PackOption = {
  id: string;
  label: string;
  priceInPaise: number;
  compareAtPaise: number | null;
  inStock: boolean;
};

export function AddToCart({ options }: { options: PackOption[] }) {
  const firstInStock = options.find((o) => o.inStock) ?? options[0];
  const [selectedId, setSelectedId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = options.find((o) => o.id === selectedId);
  if (!selected) return <p className="text-brown">No pack sizes available.</p>;

  function submit(buyNow: boolean) {
    setMessage(null);
    startTransition(async () => {
      const res = await addToCart(selected!.id, qty, { buyNow });
      // On buyNow success the action redirects, so we only get here for add-to-cart or errors.
      if (res) setMessage({ ok: res.ok, text: res.message ?? "" });
    });
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="font-serif text-xl text-forest">Pack size</legend>
        <div className="mt-3 grid gap-2">
          {options.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm shadow-soft",
                o.id === selectedId ? "border-forest ring-1 ring-forest" : "border-cashew",
                !o.inStock && "opacity-60",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="pack"
                  value={o.id}
                  checked={o.id === selectedId}
                  onChange={() => setSelectedId(o.id)}
                  disabled={!o.inStock}
                  className="accent-forest"
                />
                <span className="text-chocolate">{o.label}</span>
              </span>
              <span className="flex items-center gap-3">
                {o.compareAtPaise && o.compareAtPaise > o.priceInPaise && (
                  <s className="text-xs text-brown">{formatINR(o.compareAtPaise)}</s>
                )}
                <span className="text-brown">{formatINR(o.priceInPaise)}</span>
                <span className={o.inStock ? "text-xs text-forest" : "text-xs text-brown"}>
                  {o.inStock ? "In stock" : "Out of stock"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-full border border-cashew bg-white" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" className="p-3 disabled:opacity-40" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus size={16} />
          </button>
          <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase quantity" className="p-3 disabled:opacity-40" disabled={qty >= MAX_QTY_PER_LINE} onClick={() => setQty((q) => Math.min(MAX_QTY_PER_LINE, q + 1))}>
            <Plus size={16} />
          </button>
        </div>
        <p className="text-lg text-chocolate">{formatINR(selected.priceInPaise * qty)}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" disabled={pending || !selected.inStock} onClick={() => submit(false)}>
          {pending ? "Adding…" : selected.inStock ? "Add to cart" : "Out of stock"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={pending || !selected.inStock} onClick={() => submit(true)}>
          Buy now
        </Button>
      </div>

      <p role={message?.ok === false ? "alert" : "status"} className={cn("min-h-5 text-sm", message?.ok ? "text-forest" : "text-red-700")}>
        {message?.text}
      </p>
    </div>
  );
}
