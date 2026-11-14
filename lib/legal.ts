/**
 * The list of policy pages (slug + title). The text of each page is in lib/policies.ts.
 * Kept free of other imports because proxy.ts uses it.
 */
export const legalPages = [
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms of Service" },
  { slug: "returns-policy", title: "Refund & Cancellation Policy" },
  { slug: "shipping-policy", title: "Shipping Policy" },
  { slug: "cookie-policy", title: "Cookie Policy" },
  { slug: "photo-credits", title: "Credits & Licences" },
] as const;

export type LegalSlug = (typeof legalPages)[number]["slug"];

/** True for /legal/<something> where <something> is not one of our policy pages (used to answer with a real 404). */
export function isUnknownLegalPath(pathname: string): boolean {
  const m = pathname.match(/^\/legal\/([^/]*)\/?$/);
  if (!m) return pathname.startsWith("/legal/"); // deeper junk like /legal/a/b is unknown too
  return !legalPages.some((p) => p.slug === m[1]);
}
