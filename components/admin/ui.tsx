import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl text-forest">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brown">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({ label, value, hint, href, tone = "default" }: { label: string; value: string; hint?: string; href?: string; tone?: "default" | "warn" }) {
  const body = (
    <div className={cn("rounded-card p-5 shadow-soft", tone === "warn" ? "bg-gold/25" : "bg-white")}>
      <p className="text-xs uppercase tracking-widest text-brown">{label}</p>
      <p className="mt-2 font-serif text-3xl text-chocolate">{value}</p>
      {hint && <p className="mt-1 text-xs text-brown">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block transition-transform hover:-translate-y-0.5">{body}</Link> : body;
}

const BADGE: Record<string, string> = {
  PENDING_PAYMENT: "bg-cashew text-chocolate",
  PAID: "bg-forest/15 text-forest",
  PROCESSING: "bg-gold/30 text-chocolate",
  SHIPPED: "bg-brown/20 text-brown",
  DELIVERED: "bg-forest text-cream",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-red-100 text-red-800",
  NEW: "bg-gold/40 text-chocolate",
  CONTACTED: "bg-cashew text-chocolate",
  QUOTED: "bg-brown/20 text-brown",
  CONVERTED: "bg-forest text-cream",
  CLOSED: "bg-chocolate/15 text-chocolate",
  ACTIVE: "bg-forest/15 text-forest",
  INACTIVE: "bg-chocolate/15 text-chocolate",
  DRAFT: "bg-cashew text-chocolate",
  SENT: "bg-brown/20 text-brown",
  ACCEPTED: "bg-forest text-cream",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-chocolate/15 text-chocolate",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs", BADGE[value] ?? "bg-cashew text-chocolate")}>{label ?? value}</span>;
}

export const tableClasses = {
  wrap: "overflow-x-auto rounded-card bg-white shadow-soft",
  table: "w-full min-w-[40rem] text-sm",
  head: "bg-cashew/40 text-left text-xs uppercase tracking-widest text-brown",
  th: "px-4 py-3 font-normal",
  td: "px-4 py-3",
  row: "border-t border-cashew",
};

export function Pager({ basePath, params, page, totalPages }: { basePath: string; params: Record<string, string | undefined>; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-4 text-sm">
      {page > 1 && <Link href={href(page - 1)} className="text-forest underline">Previous</Link>}
      <span className="text-brown">Page {page} of {totalPages}</span>
      {page < totalPages && <Link href={href(page + 1)} className="text-forest underline">Next</Link>}
    </nav>
  );
}
