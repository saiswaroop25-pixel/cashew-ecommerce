import { z } from "zod";

/** Optional https link: social profiles etc. (never javascript:, data: or http:). */
const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), `${label} must start with https://`);

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).optional().transform((v) => v ?? "");

/* ───────────────────────── Company & contact details ───────────────────────── */

export const siteSettingsSchema = z.object({
  name: text(80),
  tagline: text(120),
  about: text(1200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ?? "").replace(/[\s()-]/g, ""))
    .refine((v) => v === "" || /^\+?\d{8,15}$/.test(v), "Enter a valid phone number"),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ?? "").replace(/[\s+()-]/g, ""))
    .refine((v) => v === "" || /^[1-9]\d{7,14}$/.test(v), "Use digits with country code, e.g. 919876543210"),
  address: text(400),
  instagramUrl: httpsUrl("Instagram link"),
  facebookUrl: httpsUrl("Facebook link"),
  youtubeUrl: httpsUrl("YouTube link"),
  legalName: text(120),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "A GST number has 15 characters, like 22AAAAA0000A1Z5"),
  fssai: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ?? "").replace(/\s/g, ""))
    .refine((v) => v === "" || /^\d{14}$/.test(v), "An FSSAI licence number has 14 digits"),
  grievanceName: text(80),
  grievanceEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address"),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

/* ───────────────────────── Homepage banners ───────────────────────── */

/** Same-site path ("/shop") or https URL. Blocks "//evil.com", "javascript:", "data:" and friends. */
export const bannerLinkSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => v ?? "")
  .refine((v) => v === "" || /^\/(?!\/)[^\s\\]*$/.test(v) || /^https:\/\/[^\s]+$/i.test(v), "Use a page like /shop, or a full link starting with https://");

export const bannerSchema = z
  .object({
    title: z.string().trim().min(2, "Enter a headline").max(90, "Keep the headline under 90 characters"),
    subtitle: text(200),
    linkUrl: bannerLinkSchema,
    linkLabel: text(30),
    isActive: z.boolean().default(true),
  })
  .superRefine((b, ctx) => {
    if (b.linkUrl && !b.linkLabel) ctx.addIssue({ code: "custom", path: ["linkLabel"], message: "Add the button text for this link" });
  })
  .transform((b) => ({
    title: b.title,
    subtitle: b.subtitle || null,
    linkUrl: b.linkUrl || null,
    linkLabel: b.linkUrl ? b.linkLabel : null,
    isActive: b.isActive,
  }));
export type BannerInput = z.infer<typeof bannerSchema>;
