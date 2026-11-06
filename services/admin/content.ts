import "server-only";
import { EMPTY_SETTINGS, type SiteSettings } from "@/lib/site";
import type { BannerInput, SiteSettingsInput } from "@/lib/validators/admin-content";
import { prisma } from "@/lib/prisma";
import { logAudit, type Actor } from "@/services/admin/audit";
import { removeByUrl, verifyUploadedObject } from "@/services/admin/media";
import { AdminError } from "@/services/admin/products";
import { parseSavedSettings } from "@/services/site";

/* ───────────────────────── Company & contact details ───────────────────────── */

/** What the admin has actually saved (not merged with defaults), for pre-filling the form. */
export async function getSavedSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  return { ...EMPTY_SETTINGS, ...parseSavedSettings(row?.value) };
}

export async function saveSiteSettings(input: SiteSettingsInput, actor: Actor) {
  await prisma.siteSetting.upsert({ where: { key: "site" }, update: { value: input }, create: { key: "site", value: input } });
  await logAudit(actor, { action: "settings.site", entity: "SiteSetting", entityId: "site", summary: "Updated company and contact details" });
}

/* ───────────────────────── Banners ───────────────────────── */

export async function listAdminBanners() {
  return prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function createBanner(input: BannerInput, actor: Actor) {
  const last = await prisma.banner.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const banner = await prisma.banner.create({ data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  await logAudit(actor, { action: "banner.create", entity: "Banner", entityId: banner.id, summary: `Created banner "${banner.title}"` });
  return banner;
}

export async function updateBanner(id: string, input: BannerInput, actor: Actor) {
  const banner = await prisma.banner.update({ where: { id }, data: input }).catch(() => null);
  if (!banner) throw new AdminError("Banner not found.");
  await logAudit(actor, { action: "banner.update", entity: "Banner", entityId: id, summary: `Updated banner "${banner.title}"${input.isActive ? "" : " (hidden)"}` });
}

export async function deleteBanner(id: string, actor: Actor) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new AdminError("Banner not found.");
  await prisma.banner.delete({ where: { id } });
  await removeByUrl(banner.imageUrl);
  await logAudit(actor, { action: "banner.delete", entity: "Banner", entityId: id, summary: `Deleted banner "${banner.title}"` });
}

/** Moves a banner one place earlier/later; renumbers so ties can never make the order ambiguous. */
export async function moveBanner(id: string, direction: "up" | "down", actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const all = await tx.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const i = all.findIndex((b) => b.id === id);
    if (i < 0) throw new AdminError("Banner not found.");
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    for (const [n, b] of all.entries()) await tx.banner.update({ where: { id: b.id }, data: { sortOrder: n } });
  });
  await logAudit(actor, { action: "banner.move", entity: "Banner", entityId: id, summary: `Moved a banner ${direction}` });
}

export async function setBannerImage(id: string, path: string, actor: Actor) {
  const banner = await prisma.banner.findUnique({ where: { id }, select: { title: true, imageUrl: true } });
  if (!banner) throw new AdminError("Banner not found.");
  const { url } = await verifyUploadedObject(path, "banner-image");
  await prisma.banner.update({ where: { id }, data: { imageUrl: url } });
  await removeByUrl(banner.imageUrl); // replace: the old file goes away
  await logAudit(actor, { action: "banner.image", entity: "Banner", entityId: id, summary: `Set the image for banner "${banner.title}"` });
}

export async function removeBannerImage(id: string, actor: Actor) {
  const banner = await prisma.banner.findUnique({ where: { id }, select: { title: true, imageUrl: true } });
  if (!banner) throw new AdminError("Banner not found.");
  await prisma.banner.update({ where: { id }, data: { imageUrl: null } });
  await removeByUrl(banner.imageUrl);
  await logAudit(actor, { action: "banner.image.remove", entity: "Banner", entityId: id, summary: `Removed the image from banner "${banner.title}"` });
}
