/**
 * Business information shown across the site.
 *
 * Values come from the admin-editable "site" settings (company & contact details). Anything the admin
 * has not filled in falls back to the environment defaults below, and finally to a neutral placeholder,
 * so the site always renders sensibly even before real details are entered.
 */
export type SiteSettings = {
  name: string;
  tagline: string;
  about: string;
  email: string;
  phone: string;
  /** digits only, with country code (used for wa.me links) */
  whatsapp: string;
  address: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
};

export const EMPTY_SETTINGS: SiteSettings = {
  name: "",
  tagline: "",
  about: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  instagramUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
};

/** Environment defaults (kept so the site works before anything is entered in the admin). */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Your Cashew Brand",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Premium cashews",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
} as const;

export type ResolvedSite = SiteSettings & { url: string };

export type EnvDefaults = { name: string; url: string; tagline: string; whatsappNumber: string; contactEmail: string };

/** Admin settings win; empty values fall back to environment defaults. Pure, so it is unit tested. */
export function resolveSite(saved: Partial<SiteSettings> | null | undefined, env: EnvDefaults = site): ResolvedSite {
  const s = { ...EMPTY_SETTINGS, ...(saved ?? {}) };
  return {
    ...s,
    name: s.name.trim() || env.name,
    tagline: s.tagline.trim() || env.tagline,
    email: s.email.trim() || env.contactEmail,
    whatsapp: (s.whatsapp.trim() || env.whatsappNumber).replace(/[^\d]/g, ""),
    url: env.url, // the domain is a deployment setting, not editable in the admin
  };
}
