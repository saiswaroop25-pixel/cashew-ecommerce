"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

// Only routes that exist. New pages are added here as their phases ship.
const links = [
  { href: "/shop", label: "Shop" },
  { href: "/#process", label: "Our process" },
  { href: "/bulk-orders", label: "Bulk orders" },
];

export function Header({ siteName, authSlot, cartSlot }: { siteName: string; authSlot?: React.ReactNode; cartSlot?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-cashew bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-serif text-xl text-forest" onClick={() => setOpen(false)}>
          {siteName}
        </Link>

        <div className="flex items-center gap-2 lg:gap-8">
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-chocolate hover:text-forest">
                {l.label}
              </Link>
            ))}
            {authSlot}
          </nav>
          {cartSlot}
          <button
            type="button"
            className="rounded-full p-2 text-forest hover:bg-cashew/50 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-cashew bg-cream px-4 py-4 lg:hidden">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-chocolate hover:bg-cashew/50"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="px-3 py-3" onClick={() => setOpen(false)}>{authSlot}</li>
          </ul>
        </nav>
      )}
    </header>
  );
}
