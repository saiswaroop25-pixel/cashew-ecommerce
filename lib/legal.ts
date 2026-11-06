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
] as const;

export type LegalSlug = (typeof legalPages)[number]["slug"];
