"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { deepErrors } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth/dal";
import { bannerSchema, siteSettingsSchema } from "@/lib/validators/admin-content";
import { echoValues, type FormState } from "@/lib/validators/auth";
import {
  createBanner,
  deleteBanner,
  moveBanner,
  removeBannerImage,
  saveSiteSettings,
  setBannerImage,
  updateBanner,
} from "@/services/admin/content";
import { AdminError } from "@/services/admin/products";

const idSchema = z.string().min(1).max(40);

async function run(fn: () => Promise<void>, ok: string): Promise<FormState> {
  try {
    await fn();
    return { ok: true, message: ok };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("admin content action failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const refreshSite = () => {
  updateTag("site-settings"); // header, footer, bulk page, emails see the change immediately
  revalidatePath("/admin/settings");
};
const refreshBanners = () => {
  updateTag("banners");
  revalidatePath("/admin/banners");
};

/* ───────────────────────── Company & contact details ───────────────────────── */

export async function saveSiteSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = siteSettingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error), message: "Please fix the highlighted fields.", values: echoValues(fd) };
  const result = await run(() => saveSiteSettings(parsed.data, { id: admin.id, email: admin.email }), "Saved. Your details are now live across the site.");
  if (result.ok) refreshSite();
  return result;
}

/* ───────────────────────── Banners ───────────────────────── */

function bannerRaw(fd: FormData) {
  return {
    title: fd.get("title") ?? "",
    subtitle: fd.get("subtitle") ?? "",
    linkUrl: fd.get("linkUrl") ?? "",
    linkLabel: fd.get("linkLabel") ?? "",
    isActive: fd.get("isActive") === "on",
  };
}

export async function createBannerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = bannerSchema.safeParse(bannerRaw(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const result = await run(async () => void (await createBanner(parsed.data, { id: admin.id, email: admin.email })), "Banner created. Add an image below if you like.");
  if (result.ok) refreshBanners();
  return result;
}

export async function updateBannerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const parsed = bannerSchema.safeParse(bannerRaw(fd));
  if (!id.success) return { ok: false, message: "Invalid request." };
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const result = await run(() => updateBanner(id.data, parsed.data, { id: admin.id, email: admin.email }), "Banner saved.");
  if (result.ok) refreshBanners();
  return result;
}

export async function deleteBannerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => deleteBanner(id.data, { id: admin.id, email: admin.email }), "Banner deleted.");
  if (result.ok) refreshBanners();
  return result;
}

export async function moveBannerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const dir = z.enum(["up", "down"]).safeParse(fd.get("direction"));
  if (!id.success || !dir.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => moveBanner(id.data, dir.data, { id: admin.id, email: admin.email }), "Order updated.");
  if (result.ok) refreshBanners();
  return result;
}

/** Called by the uploader after the file is in storage; the server then verifies the real file. */
export async function setBannerImageAction(bannerId: string, path: string): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z.object({ bannerId: idSchema, path: z.string().min(10).max(120) }).safeParse({ bannerId, path });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => setBannerImage(parsed.data.bannerId, parsed.data.path, { id: admin.id, email: admin.email }), "Image saved.");
  if (result.ok) refreshBanners();
  return result;
}

export async function removeBannerImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => removeBannerImage(id.data, { id: admin.id, email: admin.email }), "Image removed.");
  if (result.ok) refreshBanners();
  return result;
}
