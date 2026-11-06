import type { Metadata } from "next";
import { BannerList, NewBanner } from "@/components/admin/banner-manager";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { listAdminBanners } from "@/services/admin/content";

export const metadata: Metadata = { title: "Banners" };

// Private, login-only page: allowed to block on the session and live data (opts out of Next's dev instant-navigation check).
export const instant = false;

export default async function AdminBannersPage() {
  await requireAdmin();
  const banners = await listAdminBanners();
  return (
    <>
      <PageHeader title="Home page banners" subtitle="Highlights shown at the top of the home page (offers, announcements, new arrivals). The first three that are switched on are shown, in this order." />
      <div className="space-y-8">
        <NewBanner />
        <section aria-labelledby="existing-h">
          <h2 id="existing-h" className="mb-3 font-serif text-xl text-forest">Your banners</h2>
          <BannerList banners={banners} />
        </section>
      </div>
    </>
  );
}
