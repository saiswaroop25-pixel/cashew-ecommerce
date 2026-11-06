/**
 * Central, configurable business information.
 * Everything here is a PLACEHOLDER until real details are provided; later
 * phases move these values into the admin-managed SiteSetting table.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Your Cashew Brand",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  tagline: "Premium cashews, placeholder tagline",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
} as const;
