import { expect, test } from "@playwright/test";

test.describe("security headers", () => {
  test("pages carry the security headers and do not advertise the framework", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBeTruthy();
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("private pages are never cached", async ({ request }) => {
    for (const path of ["/cart", "/checkout", "/login"]) {
      const res = await request.get(path);
      expect(res.headers()["cache-control"] ?? "", path).toContain("no-store");
    }
  });

  test("cron endpoints refuse requests without the secret", async ({ request }) => {
    for (const path of ["/api/cron/expire-orders", "/api/cron/maintenance"]) {
      const res = await request.get(path);
      expect([401, 403, 503]).toContain(res.status());
    }
  });

  test("the payment webhook refuses unsigned requests", async ({ request }) => {
    const res = await request.post("/api/webhooks/razorpay", { data: { event: "payment.captured" } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("search engine basics", () => {
  test("robots.txt keeps private areas out and points to the sitemap", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const p of ["/admin", "/account", "/cart", "/checkout", "/api/"]) expect(body).toContain(`Disallow: ${p}`);
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test("sitemap lists public pages only", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("/shop");
    expect(body).toContain("/products/");
    expect(body).not.toMatch(/\/admin|\/account|\/cart|\/checkout/);
  });

  test("home and product pages have canonical links, titles and structured data", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
    expect(await page.title()).not.toBe("");

    await page.goto("/shop");
    await page.getByRole("link", { name: /Raw Whole Cashews W180/ }).first().click();
    await page.waitForURL(/\/products\//);
    const readTypes = async () => {
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      return ld.flatMap((t) => {
        const j = JSON.parse(t);
        return (Array.isArray(j) ? j : [j]).map((x: { "@type": string }) => x["@type"]);
      });
    };
    // The product's structured data streams in with the page body, so wait for it.
    await expect.poll(readTypes).toEqual(expect.arrayContaining(["Product", "BreadcrumbList"]));
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  });
});
