import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, organizationJsonLd, productJsonLd, serializeJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

describe("organizationJsonLd", () => {
  it("includes only what is filled in (no empty or invented fields)", () => {
    const o = organizationJsonLd({ name: "Acme", url: "https://acme.test", email: "", phone: "", address: "", social: [] });
    expect(o).toEqual({ "@context": "https://schema.org", "@type": "Organization", name: "Acme", url: "https://acme.test" });
  });
  it("adds contact details, a one-line address and https-only social links", () => {
    const o = organizationJsonLd({ name: "Acme", url: "https://acme.test", email: "hi@acme.test", phone: "+919876543210", address: "1 Road\nMangaluru", social: ["https://instagram.com/acme", "http://insecure.test", "javascript:alert(1)"] });
    expect(o).toMatchObject({ email: "hi@acme.test", telephone: "+919876543210", address: { streetAddress: "1 Road, Mangaluru" }, sameAs: ["https://instagram.com/acme"] });
  });
});

describe("productJsonLd", () => {
  const base = { name: "Raw Cashews W240", description: "Whole raw kernels.", url: "https://acme.test/products/raw", images: ["https://img.test/1.jpg"], brand: "Acme", category: "Whole Cashews" };
  it("summarises the price range in INR with exact decimals and stock status", () => {
    const p = productJsonLd({ ...base, variants: [{ sku: "A-250", pricePaise: 29950, inStock: true }, { sku: "A-1000", pricePaise: 107820, inStock: false }] });
    expect(p).toMatchObject({ "@type": "Product", sku: "A-250", brand: { name: "Acme" } });
    expect(p.offers).toMatchObject({ "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: "299.50", highPrice: "1078.20", offerCount: 2, availability: "https://schema.org/InStock" });
  });
  it("is OutOfStock only when every pack is out of stock", () => {
    const p = productJsonLd({ ...base, variants: [{ sku: "A", pricePaise: 1000, inStock: false }] });
    expect((p.offers as Record<string, unknown>).availability).toBe("https://schema.org/OutOfStock");
  });
  it("never claims ratings or reviews (there are none)", () => {
    const text = JSON.stringify(productJsonLd({ ...base, variants: [{ sku: "A", pricePaise: 1000, inStock: true }] }));
    expect(text).not.toMatch(/aggregateRating|ratingValue|reviewCount|"review"/);
  });
  it("omits offers and images when there is nothing real to say", () => {
    const p = productJsonLd({ ...base, images: [], variants: [] });
    expect(p).not.toHaveProperty("offers");
    expect(p).not.toHaveProperty("image");
  });
});

describe("breadcrumbs and website", () => {
  it("numbers breadcrumb items from 1", () => {
    const b = breadcrumbJsonLd([{ name: "Home", url: "https://a.test" }, { name: "Shop", url: "https://a.test/shop" }]);
    expect(b.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://a.test" },
      { "@type": "ListItem", position: 2, name: "Shop", item: "https://a.test/shop" },
    ]);
  });
  it("describes the shop search for the sitelinks search box", () => {
    expect(JSON.stringify(websiteJsonLd("Acme", "https://a.test"))).toContain("https://a.test/shop?q={search_term_string}");
  });
});

describe("serializeJsonLd (script-injection safe)", () => {
  it("escapes < so a hostile product name cannot close the script tag or add markup", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script");
    // and it is still valid JSON that round-trips to the original text
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script><img src=x onerror=alert(1)>");
  });
  it("escapes the line separators that break old parsers", () => {
    expect(serializeJsonLd({ t: "a\u2028b\u2029c" })).not.toMatch(/[\u2028\u2029]/);
  });
});
