import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("home page shows the hero photo, headline and calls to action", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cashews, chosen with care");
    await expect(page.getByRole("link", { name: "Shop now" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore bulk orders" })).toBeVisible();

    const hero = page.getByAltText(/basket filled with whole/i);
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

    await expect(page.getByRole("heading", { name: "Featured cashews" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From fruit to finished pack" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("home page does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("no product is labelled Demo", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByText("Demo", { exact: true })).toHaveCount(0);
    await expect(page.getByText("(Demo)")).toHaveCount(0);
  });

  test("shop lists products with pictures and can be searched", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "the filter panel is laid out differently on phones");
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop", level: 1 })).toBeVisible();
    const cards = page.locator("ul li", { has: page.getByRole("link", { name: /Cashews/ }) });
    expect(await cards.count()).toBeGreaterThanOrEqual(4);

    await page.getByPlaceholder(/Search cashews/).fill("broken");
    await page.getByRole("button", { name: /search/i }).first().click();
    await expect(page).toHaveURL(/q=broken/);
    await expect(page.getByRole("heading", { name: "Broken Cashews" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Salted Cashews/ })).toHaveCount(0);
  });

  test("a product page shows details and price", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("link", { name: /Raw Whole Cashews W180/ }).first().click();
    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Raw Whole Cashews W180");
    await expect(page.getByText(/₹\s?\d/).first()).toBeVisible();
  });

  test("legal pages and photo credits are reachable from the footer", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Privacy Policy", "Terms & Conditions", "Photo Credits"]) {
      await page.getByRole("contentinfo").getByRole("link", { name }).click();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await page.goto("/");
    }
  });

  test("navigation links work", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "the desktop navigation bar is covered here");
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Bulk orders" }).click();
    await expect(page).toHaveURL(/bulk-orders/);
    await page.getByRole("banner").getByRole("link", { name: "Shop" }).click();
    await expect(page).toHaveURL(/\/shop/);
  });
});

test.describe("unknown addresses", () => {
  test("unknown legal pages return a real 404", async ({ request }) => {
    const res = await request.get("/legal/no-such-policy");
    expect(res.status()).toBe(404);
  });

  test("unknown pages show the branded 404 page", async ({ page }) => {
    const res = await page.goto("/definitely-missing");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/could not find that page/i)).toBeVisible();
  });

  test("unknown products are kept out of search results", async ({ page }) => {
    await page.goto("/products/no-such-product");
    await expect(page.getByText(/could not find that page/i)).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});
