import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const tabs = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl text-forest">My account</h1>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">Sign out</Button>
        </form>
      </div>
      <nav aria-label="Account" className="mt-6 flex gap-2 border-b border-cashew">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-t-lg px-4 py-2 text-sm text-chocolate hover:bg-cashew/50">
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        {/* Pages read the session (request-time data), so they stream inside Suspense. */}
        <Suspense fallback={<p className="text-brown">Loading…</p>}>{children}</Suspense>
      </div>
    </main>
  );
}
