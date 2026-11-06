import { describe, expect, it } from "vitest";
import { EMPTY_SETTINGS, resolveSite, type SiteSettings } from "@/lib/site";
import { bannerLinkSchema, bannerSchema, siteSettingsSchema } from "@/lib/validators/admin-content";

describe("siteSettingsSchema", () => {
  it("accepts an empty form (every field is optional) and a full one, normalising values", () => {
    expect(siteSettingsSchema.parse({})).toMatchObject({ name: "", email: "", whatsapp: "" });
    const r = siteSettingsSchema.parse({ name: " Acme Cashews ", email: " Hello@Acme.IN ", phone: "+91 98765-43210", whatsapp: "+91 98765 43210", instagramUrl: "https://instagram.com/acme" });
    expect(r).toMatchObject({ name: "Acme Cashews", email: "hello@acme.in", phone: "+919876543210", whatsapp: "919876543210" });
  });
  it.each([
    [{ email: "not-an-email" }, "email"],
    [{ phone: "12" }, "phone"],
    [{ whatsapp: "0123456789" }, "whatsapp"],
    [{ instagramUrl: "http://insecure.example" }, "instagramUrl"],
    [{ facebookUrl: "javascript:alert(1)" }, "facebookUrl"],
    [{ youtubeUrl: "ftp://x" }, "youtubeUrl"],
    [{ about: "x".repeat(1201) }, "about"],
  ])("rejects %j", (input, field) => {
    const r = siteSettingsSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues.some((i) => i.path[0] === field)).toBe(true);
  });
});

describe("bannerLinkSchema (open-redirect and script-link guard)", () => {
  it.each(["", "/shop", "/products/raw-w240?x=1", "https://example.com/offer"])("accepts %j", (v) => expect(bannerLinkSchema.safeParse(v).success).toBe(true));
  it.each(["//evil.com", "javascript:alert(1)", "data:text/html,<script>", "http://insecure.example", "shop", "/a b", "/\\evil.com", "ftp://x"])("rejects %j", (v) => {
    expect(bannerLinkSchema.safeParse(v).success).toBe(false);
  });
});

describe("bannerSchema", () => {
  it("needs a headline; button text is required when there is a link", () => {
    expect(bannerSchema.safeParse({ title: "" }).success).toBe(false);
    const noLabel = bannerSchema.safeParse({ title: "Sale", linkUrl: "/shop" });
    expect(noLabel.success).toBe(false);
    expect(bannerSchema.parse({ title: "Sale", linkUrl: "/shop", linkLabel: "Shop now" })).toMatchObject({ linkUrl: "/shop", linkLabel: "Shop now" });
  });
  it("drops the button text when there is no link, and turns blanks into null", () => {
    expect(bannerSchema.parse({ title: "Hello", linkLabel: "Ignored", subtitle: "" })).toEqual({ title: "Hello", subtitle: null, linkUrl: null, linkLabel: null, isActive: true });
  });
});

describe("resolveSite (admin values win, env fills the gaps)", () => {
  const env = { name: "Env Name", url: "https://site.test", tagline: "Env tagline", whatsappNumber: "919111111111", contactEmail: "env@site.test" } as const;
  it("uses env defaults when nothing is saved", () => {
    expect(resolveSite(null, env)).toMatchObject({ name: "Env Name", email: "env@site.test", whatsapp: "919111111111", url: "https://site.test" });
    expect(resolveSite(EMPTY_SETTINGS, env).tagline).toBe("Env tagline");
  });
  it("prefers saved values, per field", () => {
    const saved: Partial<SiteSettings> = { name: "Saved Name", whatsapp: "+91 98765 43210" };
    expect(resolveSite(saved, env)).toMatchObject({ name: "Saved Name", whatsapp: "919876543210", email: "env@site.test" });
  });
  it("ignores whitespace-only saved values and never lets settings change the site URL", () => {
    expect(resolveSite({ name: "   " }, env).name).toBe("Env Name");
    expect(resolveSite({ url: "https://evil.test" } as unknown as Partial<SiteSettings>, env).url).toBe("https://site.test");
  });
});
