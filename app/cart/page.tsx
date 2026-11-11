import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CouponForm, LineControls } from "@/components/cart/cart-controls";
import { OrderSummary } from "@/components/cart/order-summary";
import { LinkButton } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { getCartView } from "@/services/cart";

export const metadata: Metadata = { title: "Your cart", description: "Review the cashews in your cart before checkout.", robots: { index: false } };

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">Your cart</h1>
      <Suspense fallback={<p className="mt-8 text-brown">Loading your cart…</p>}>
        <CartBody />
      </Suspense>
    </main>
  );
}

async function CartBody() {
  const cart = await getCartView();

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8 rounded-card bg-white p-10 text-center shadow-soft">
        <p className="text-chocolate">Your cart is empty.</p>
        <LinkButton href="/shop" className="mt-4">Browse cashews</LinkButton>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-4">
        {cart.lines.map((l) => (
          <li key={l.itemId} className="flex gap-4 rounded-card bg-white p-4 shadow-soft">
            <Link href={`/products/${l.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-cashew/40">
              {l.imageUrl ? (
                <Image src={l.imageUrl} alt={l.imageAlt ?? l.productName} fill sizes="96px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-brown">No image</span>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex justify-between gap-3">
                <div>
                  <Link href={`/products/${l.slug}`} className="font-serif text-lg leading-snug text-chocolate hover:text-forest">{l.productName}</Link>
                  <p className="text-sm text-brown">{l.variantLabel} · {formatINR(l.unitPricePaise)} each</p>
                </div>
                <p className="shrink-0 text-chocolate">{formatINR(l.lineTotalPaise)}</p>
              </div>
              {l.problem && <p role="alert" className="text-sm text-red-700">{l.problem} – adjust or remove this item to continue.</p>}
              <LineControls itemId={l.itemId} quantity={l.quantity} available={l.available} name={`${l.productName} ${l.variantLabel}`} />
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit space-y-5 rounded-card bg-white p-6 shadow-soft lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl text-forest">Order summary</h2>
        <CouponForm applied={cart.coupon} />
        <OrderSummary totals={cart.totals} couponCode={cart.coupon?.ok ? cart.coupon.code : null} />
        {cart.canCheckout ? (
          <LinkButton href="/checkout" size="lg" className="w-full">Proceed to checkout</LinkButton>
        ) : (
          <p className="text-sm text-red-700">Fix the items marked above to continue.</p>
        )}
        <Link href="/shop" className="block text-center text-sm text-forest underline">Continue shopping</Link>
      </aside>
    </div>
  );
}
