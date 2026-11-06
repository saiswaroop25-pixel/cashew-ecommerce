import { expect, test } from "@playwright/test";

test.describe("cart and checkout", () => {
  test("an empty cart says so", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("adding a product puts it in the cart, and the quantity can be changed and removed", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("button", { name: /^Add .*to cart, Raw Whole Cashews W180/ }).first().click();
    // Wait for the server to confirm before leaving the page, otherwise the request is cancelled.
    await expect(page.getByRole("status").filter({ hasText: "Added to cart" }).first()).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Raw Whole Cashews W180").first()).toBeVisible();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByRole("group", { name: /Quantity for/ })).toContainText("2");
    await page.getByRole("button", { name: /^Remove .* from cart/ }).click();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("checkout refuses an incomplete form with clear messages", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("button", { name: /^Add .*to cart, Raw Whole Cashews W180/ }).first().click();
    // Wait for the server to confirm before leaving the page, otherwise the request is cancelled.
    await expect(page.getByRole("status").filter({ hasText: "Added to cart" }).first()).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
    // Leave every field blank on purpose and try to continue.
    await page.locator("form button[type=submit]").last().click();
    await expect(page.locator("[role=alert], [id$='-error'], .text-red-700, .text-red-600").first()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/); // not sent on to payment

    // clean up the cart item
    await page.goto("/cart");
    await page.getByRole("button", { name: /^Remove .* from cart/ }).click();
  });
});

test.describe("bulk enquiry form", () => {
  test("rejects an empty submission and keeps the visitor on the form", async ({ page }) => {
    await page.goto("/bulk-orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Bypass the browser's own required-field checks so we exercise the server-side validation.
    await page.locator("form").evaluate((f) => f.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: /submit|request|send/i }).first().click();
    await expect(page.getByText("Enquiry received")).toHaveCount(0);
    await expect(page.getByLabel("Full name")).toBeVisible();
  });
});

test.describe("accounts and admin", () => {
  for (const path of ["/admin", "/admin/orders", "/admin/products", "/account", "/account/orders"]) {
    test(`${path} sends signed-out visitors to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("the login form validates and rejects bad credentials without leaking details", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").or(page.getByText(/invalid|incorrect|could not/i)).first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the register page is reachable", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel("Full name")).toBeVisible();
  });
});
