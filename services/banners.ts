import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export type PublicBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
};

/** Active homepage banners, in the admin's chosen order. Cached; refreshed when an admin saves (tag "banners"). */
export async function getActiveBanners(): Promise<PublicBanner[]> {
  "use cache";
  cacheTag("banners");
  cacheLife("hours");
  return prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 3, // a few at most - this is a highlight strip, not a carousel
    select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true, linkLabel: true },
  });
}
