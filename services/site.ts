import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { EMPTY_SETTINGS, resolveSite, type ResolvedSite, type SiteSettings } from "@/lib/site";

/** Reads the saved settings row defensively: a malformed value must never break every page. */
export function parseSavedSettings(value: unknown): Partial<SiteSettings> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<SiteSettings> = {};
  for (const key of Object.keys(EMPTY_SETTINGS) as (keyof SiteSettings)[]) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

/**
 * Company & contact details for the whole site (header, footer, bulk page, emails...).
 * Cached for speed and refreshed immediately when an admin saves (tag "site-settings").
 */
export async function getSite(): Promise<ResolvedSite> {
  "use cache";
  cacheTag("site-settings");
  cacheLife("hours");
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  return resolveSite(parseSavedSettings(row?.value));
}
