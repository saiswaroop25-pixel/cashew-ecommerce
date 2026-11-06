"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Bulk enquiries" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/banners", label: "Home: banners" },
  { href: "/admin/process-flow", label: "Home: process flow" },
  { href: "/admin/settings", label: "Company details" },
  { href: "/admin/activity", label: "Activity log" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-lg px-3 py-2 text-sm", active ? "bg-forest text-cream" : "text-chocolate hover:bg-cashew/50")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
