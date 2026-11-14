import { expect, test } from "@playwright/test";

test.describe("legal pages and privacy tools", () => {
  for (const [path, heading] of [
    ["/legal/privacy-policy", "Privacy Policy"],
    ["/legal/terms", "Terms of Service"],
    ["/legal/returns-policy", "Refund & Cancellation Policy"],
    ["/legal/shipping-policy", "Shipping Policy"],
    ["/legal/cookie-policy", "Cookie Policy"],
  ] as const) {
    test(`${path} is a real policy, not a template`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/template|placeholder|will be described here|will set out/i);
      expect(text.length).toBeGreaterThan(400);
    });
  }

  test("the footer links to the policies, contact and the data request page", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    for (const name of ["Privacy Policy", "Terms of Service", "Refund & Cancellation Policy", "Cookie Policy", "Contact", /Your data/]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }
  });

  test("the data request form asks for an email and a choice, and validates before sending", async ({ page }) => {
    await page.goto("/data-request");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
  });

  test("registering needs agreement to the terms", async ({ page }) => {
    await page.goto("/register");
    const box = page.getByRole("checkbox", { name: /Terms of Service/ });
    await expect(box).not.toBeChecked(); // never pre-ticked
    await expect(box).toBeVisible();
  });

  test("the newsletter box is not pre-ticked", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("checkbox", { name: /agree to receive marketing emails/ })).not.toBeChecked();
  });
});

test.describe("cookie notice", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows to a new visitor, says what is used, and stays dismissed", async ({ page }) => {
    await page.goto("/");
    const notice = page.getByRole("region", { name: "Cookie notice" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("No advertising or tracking");
    await expect(notice.getByRole("link", { name: "Cookie Policy" })).toBeVisible();
    await notice.getByRole("button", { name: "Got it" }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(notice).toBeHidden();
  });
});
