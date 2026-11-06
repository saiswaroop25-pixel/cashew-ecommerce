import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderSummary } from "@/components/cart/order-summary";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { LinkButton } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { getCartView } from "@/services/cart";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl text-forest">Checkout</h1>
      <Suspense fallback={<p className="mt-8 text-brown">Loading…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const [cart, profile] = await Promise.all([getCartView(), getProfile()]);

  if (cart.lines.length === 0) {
    return (
      <div className="mt-8 rounded-card bg-white p-10 text-center shadow-soft">
        <p className="text-chocolate">Your cart is empty.</p>
        <LinkButton href="/shop" className="mt-4">Browse cashews</LinkButton>
      </div>
    );
  }
  if (!cart.canCheckout) {
    return (
      <div className="mt-8 rounded-card bg-white p-8 shadow-soft">
        <p role="alert" className="text-red-700">Some items in your cart are unavailable or low on stock.</p>
        <LinkButton href="/cart" className="mt-4">Review your cart</LinkButton>
      </div>
    );
  }

  const addresses = profile
    ? await prisma.address.findMany({ where: { profileId: profile.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })
    : [];
  const saved = addresses.map((a) => ({
    id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2,
    city: a.city, state: a.state, postalCode: a.postalCode,
  }));

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <CheckoutForm
        isSignedIn={!!profile}
        addresses={saved}
        defaults={{
          fullName: profile?.fullName ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone ?? "",
          address: saved.find((_, i) => addresses[i].isDefault),
        }}
      />
      <aside className="h-fit space-y-4 rounded-card bg-white p-6 shadow-soft lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl text-forest">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {cart.lines.map((l) => (
            <li key={l.itemId} className="flex justify-between gap-3">
              <span className="text-chocolate">{l.productName} <span className="text-brown">({l.variantLabel}) × {l.quantity}</span></span>
              <span className="shrink-0 text-brown">{formatINR(l.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
        <OrderSummary totals={cart.totals} couponCode={cart.coupon?.ok ? cart.coupon.code : null} />
        <Link href="/cart" className="block text-center text-sm text-forest underline">Edit cart</Link>
      </aside>
    </div>
  );
}
