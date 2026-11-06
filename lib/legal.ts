/**
 * Policy pages are TEMPLATES, not legal advice. The business must replace the
 * text (ideally via a lawyer) before launch. Each page shows a visible notice.
 */
export const legalPages = [
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    body: [
      "Delivery areas, charges and timelines will be described here once the business confirms its shipping arrangements.",
      "Orders are dispatched after payment is confirmed.",
    ],
  },
  {
    slug: "returns-policy",
    title: "Returns & Refunds",
    body: [
      "The business will describe its return, replacement and refund terms for food products here.",
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    body: [
      "This site collects the details needed to process orders, enquiries and newsletter subscriptions (such as name, email, phone and delivery address).",
      "Card details are handled by the payment provider and are never stored on this site.",
      "You can unsubscribe from the newsletter at any time using the link in each email.",
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    body: [
      "The business will set out its terms of sale and website use here.",
    ],
  },
  {
    slug: "photo-credits",
    title: "Photo Credits",
    template: false,
    body: [
      "Some photographs on this site are illustrative images from Wikimedia Commons and are not pictures of our own products or facility. They will be replaced with our own photographs.",
      "Product photo (salted cashews): \"Roasted salted jumbo cashews\" by Famartin, CC BY-SA 4.0.",
      "Cashew fruit on the tree: Plant Industry, CSIRO, CC BY 3.0.",
      "Cashew apples with the nut attached: Prabhupuducherry, CC BY-SA 4.0.",
      "Raw cashew nut on the ground: Gvhufm, CC BY-SA 3.0.",
      "Cashew shelling machine: Dinura Pradeep Balasooriya, CC BY-SA 2.0.",
      "Shelling and kernel separation: Sandeep Vengurlekar, CC0.",
      "Peeling cashew kernels: -JvL- (Netherlands), CC BY 2.0.",
      "Other product photographs: Fumikas Sagisavas (CC0), Khoule23 (public domain) and Daderot (CC0).",
      "Licences: creativecommons.org/licenses/by/3.0, by/2.0, by-sa/2.0, by-sa/3.0, by-sa/4.0 and creativecommons.org/publicdomain/zero/1.0. Originals are on commons.wikimedia.org.",
    ],
  },
] as const;

export type LegalSlug = (typeof legalPages)[number]["slug"];

/** True for /legal/<something> where <something> is not one of our policy pages (used to answer with a real 404). */
export function isUnknownLegalPath(pathname: string): boolean {
  const m = pathname.match(/^\/legal\/([^/]*)\/?$/);
  if (!m) return pathname.startsWith("/legal/"); // deeper junk like /legal/a/b is unknown too
  return !legalPages.some((p) => p.slug === m[1]);
}
