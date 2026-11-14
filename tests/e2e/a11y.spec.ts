import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility scan (axe-core, WCAG 2.0/2.1 A and AA rules) of the public pages.
 * Automated checks catch roughly a third of accessibility problems; they do not replace a manual keyboard and
 * screen-reader pass. Any violation fails the test, with the rule, the impact and the offending elements listed.
 */
const PAGES = [
  ["home", "/"],
  ["shop", "/shop"],
  ["product", "/products/raw-whole-w180"],
  ["bulk orders", "/bulk-orders"],
  ["cart", "/cart"],
  ["login", "/login"],
  ["register", "/register"],
  ["privacy policy", "/legal/privacy-policy"],
  ["terms", "/legal/terms"],
  ["cookie policy", "/legal/cookie-policy"],
  ["photo credits", "/legal/photo-credits"],
  ["contact", "/contact"],
  ["data request", "/data-request"],
  ["404 page", "/definitely-missing"],
] as const;

for (const [name, path] of PAGES) {
  test(`accessibility: ${name}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.impact} · ${v.id}: ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n   ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("keyboard: the first Tab stop on the home page is visible and focus can reach the main call to action", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "keyboard navigation is a desktop concern");
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, visible: r.width > 0 && r.height > 0 };
  });
  expect(focused?.visible).toBe(true);
  for (let i = 0; i < 12; i++) {
    const name = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? "");
    if (name === "Shop cashews") return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Could not reach 'Shop cashews' with the keyboard in 12 Tab presses");
});
