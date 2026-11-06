import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

// Private, login-only area: every page reads the session and live data, so it is not meant to be an instant
// (prefetched) navigation. This opts it out of Next's dev-time instant-navigation checks.
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-10 text-brown">Loading…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

/**
 * Gate for the whole area. Every admin PAGE and every admin ACTION also calls requireAdmin() itself:
 * a layout check alone is not enough, because pages can be rendered independently of layouts.
 */
async function Shell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[12rem_1fr]">
      <aside className="md:sticky md:top-24 md:h-fit">
        <p className="mb-3 hidden text-xs uppercase tracking-[0.3em] text-gold md:block">Admin</p>
        <AdminNav />
        <p className="mt-4 hidden truncate text-xs text-brown/70 md:block" title={admin.email}>{admin.email}</p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
