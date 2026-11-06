/**
 * schema.org structured data builders (pure, unit tested). Search engines use these for rich results
 * (price, availability, breadcrumbs, organisation panel).
 *
 * Honesty rules, matching the rest of the site: no star ratings or review counts unless real reviews exist,
 * and empty business fields are simply left out rather than invented.
 */
export type JsonLd = Record<string, unknown>;

/** Drop empty values so we never emit "telephone": "" or null fields. */
function clean<T extends JsonLd>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))) as T;
}

export type OrgInput = {
  name: string;
  url: string;
  email?: string;
  phone?: string;
  address?: string;
  social?: string[];
  logoUrl?: string;
  description?: string;
};

export function organizationJsonLd(o: OrgInput): JsonLd {
  return clean({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: o.name,
    url: o.url,
    logo: o.logoUrl,
    description: o.description,
    email: o.email,
    telephone: o.phone,
    address: o.address ? { "@type": "PostalAddress", streetAddress: o.address.replace(/\s*\n\s*/g, ", ") } : undefined,
    sameAs: (o.social ?? []).filter((u) => /^https:\/\//.test(u)),
  });
}

export function websiteJsonLd(name: string, url: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    // Sitelinks search box: the shop's own search
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${url}/shop?q={search_term_string}` }, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export type ProductInput = {
  name: string;
  description: string;
  url: string;
  images: string[];
  brand: string;
  category?: string;
  variants: { sku: string; pricePaise: number; inStock: boolean }[];
};

const rupees = (paise: number) => (paise / 100).toFixed(2);

export function productJsonLd(p: ProductInput): JsonLd {
  const priced = p.variants.filter((v) => v.pricePaise > 0);
  const prices = priced.map((v) => v.pricePaise);
  const anyInStock = priced.some((v) => v.inStock);
  return clean({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description.slice(0, 5000),
    url: p.url,
    image: p.images,
    sku: priced[0]?.sku,
    brand: { "@type": "Brand", name: p.brand },
    category: p.category,
    offers: priced.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: rupees(Math.min(...prices)),
          highPrice: rupees(Math.max(...prices)),
          offerCount: priced.length,
          availability: anyInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: p.url,
        }
      : undefined,
  });
}

/**
 * Serialises for a <script type="application/ld+json"> tag. "<" is escaped so text like "</script>" in a product
 * name or description can never close the tag early (script injection); U+2028/2029 are escaped for old parsers.
 */
const LS = new RegExp(String.fromCharCode(0x2028), "g"); // U+2028 LINE SEPARATOR
const PS = new RegExp(String.fromCharCode(0x2029), "g"); // U+2029 PARAGRAPH SEPARATOR

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(LS, "\\u2028").replace(PS, "\\u2029");
}
