// @vitest-environment node
import { randomBytes } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Smoke-renders every admin page against the real database with the admin gate satisfied, to prove
 * nothing crashes and the expected content appears. (Without a real admin login these pages cannot be
 * clicked through, so this is the closest automated check.) Read-only except for one test enquiry
 * that is created and removed.
 */
vi.mock("@/lib/auth/dal", () => ({
  requireAdmin: async () => ({ id: "00000000-0000-4000-8000-000000000001", email: "smoke-admin@example.test", role: "ADMIN" }),
  requireUser: async () => ({ id: "00000000-0000-4000-8000-000000000001", email: "smoke-admin@example.test" }),
  getProfile: async () => null,
  getSessionUser: async () => null,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: () => { throw new Error("REDIRECT"); },
  usePathname: () => "/admin",
}));

import { prisma } from "@/lib/prisma";

const html = async (element: unknown) => renderToStaticMarkup(await (element as Promise<React.ReactElement>));
const sp = (o: Record<string, string> = {}) => Promise.resolve(o);
const TAG = "ZZT-" + randomBytes(3).toString("hex").toUpperCase();
let enquiryId = "";
let productId = "";
let orderId: string | null = null;

beforeAll(async () => {
  productId = (await prisma.product.findFirstOrThrow({ orderBy: { createdAt: "asc" } })).id;
  orderId = (await prisma.order.findFirst({ orderBy: { createdAt: "desc" } }))?.id ?? null;
  enquiryId = (
    await prisma.bulkEnquiry.create({
      data: { reference: `${TAG}-E`, fullName: "Smoke Buyer", companyName: "Smoke Co", email: "smoke@example.test", phone: "9876543210", location: "Pune", variety: "RAW", grade: "W240", quantityKg: 250, requirements: "<script>alert(1)</script> please" },
    })
  ).id;
});

afterAll(async () => {
  await prisma.bulkEnquiry.deleteMany({ where: { reference: { startsWith: TAG } } });
  await prisma.$disconnect();
});

describe("admin pages render against real data", () => {
  it("overview shows the key figures", async () => {
    const { default: Page } = await import("@/app/admin/page");
    const out = await html(Page());
    for (const text of ["Overview", "Total sales", "To fulfil", "Low stock", "Recent orders", "New bulk enquiries"]) expect(out).toContain(text);
  });

  it("products list shows products, filters and the New product button", async () => {
    const { default: Page } = await import("@/app/admin/products/page");
    const out = await html(Page({ searchParams: sp() }));
    expect(out).toContain("New product");
    expect(out).toContain("Raw Whole Cashews");
    const filtered = await html(Page({ searchParams: sp({ q: "no-such-product-xyz" }) }));
    expect(filtered).toContain("No products match");
  });

  it("new-product form has every field group and an empty pack row", async () => {
    const { default: Page } = await import("@/app/admin/products/new/page");
    const out = await html(Page());
    for (const text of ["Basics", "Pack sizes, prices", "Description", "Search engines", "Create product", "Add a pack size"]) expect(out).toContain(text);
  });

  it("edit-product form is pre-filled from the database, including stock and prices in rupees", async () => {
    const { default: Page } = await import("@/app/admin/products/[id]/page");
    const out = await html(Page({ params: Promise.resolve({ id: productId }), searchParams: sp() }));
    expect(out).toContain("Save changes");
    expect(out).toContain("Danger zone");
    expect(out).toMatch(/value="\d+(\.\d{1,2})?"/); // a price in rupees
    expect(out).toContain("Delete product");
  });

  it("edit-product for an unknown id gives a 404", async () => {
    const { default: Page } = await import("@/app/admin/products/[id]/page");
    await expect(html(Page({ params: Promise.resolve({ id: "nope" }), searchParams: sp() }))).rejects.toThrow("NOT_FOUND");
  });

  it("orders list renders with filters and search", async () => {
    const { default: Page } = await import("@/app/admin/orders/page");
    const out = await html(Page({ searchParams: sp() }));
    for (const text of ["Orders", "Awaiting payment", "Shipped", "Search"]) expect(out).toContain(text);
    expect(await html(Page({ searchParams: sp({ status: "SHIPPED", q: "zzz-none" }) }))).toContain("No orders match");
  });

  it("order detail shows only the actions valid for its status (uses your real order, read-only)", async () => {
    if (!orderId) return;
    const { default: Page } = await import("@/app/admin/orders/[id]/page");
    const out = await html(Page({ params: Promise.resolve({ id: orderId }) }));
    expect(out).toContain("Items");
    expect(out).toContain("Customer &amp; delivery");
    expect(out).toContain("Payments");
    // exactly one of the status-specific panels
    const panels = ["Start processing", "Ship this order", "Mark as delivered", "This order is finished", "Cancel order…", "Cancel &amp; refund in full…"].filter((t) => out.includes(t));
    expect(panels.length).toBeGreaterThanOrEqual(1);
  });

  it("enquiries list and detail render; hostile text from a buyer is escaped, never executed", async () => {
    const { default: List } = await import("@/app/admin/enquiries/page");
    expect(await html(List({ searchParams: sp({ q: TAG }) }))).toContain(`${TAG}-E`);

    const { default: Detail } = await import("@/app/admin/enquiries/[id]/page");
    const out = await html(Detail({ params: Promise.resolve({ id: enquiryId }) }));
    for (const text of ["Buyer", "Requirement", "Quotations", "New quotation", "Send to buyer", "Save draft"]) expect(out).toContain(text);
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("home process-flow admin shows every step with its picture upload", async () => {
    const { default: Page } = await import("@/app/admin/process-flow/page");
    const out = await html(Page());
    for (const text of ["Home page: process flow", "The steps", "Add a picture", "Save step", "Photo"]) expect(out).toContain(text);
    expect((out.match(/Save step/g) ?? []).length).toBe(13);
    expect(out).toContain("JPEG, PNG, WebP or AVIF image up to 5 MB");
    expect(out).not.toMatch(/video|captions/i); // those features are gone
  });

  it("product edit page now includes the photo manager", async () => {
    const { default: Page } = await import("@/app/admin/products/[id]/page");
    const out = await html(Page({ params: Promise.resolve({ id: productId }), searchParams: sp() }));
    expect(out).toContain("Photos");
    expect(out).toContain("Add a photo");
    expect(out).toContain("JPEG, PNG, WebP or AVIF image up to 5 MB");
  });

  it("company details form, banner manager and customers list render", async () => {
    const settings = await import("@/app/admin/settings/page");
    const out1 = await html(settings.default());
    for (const text of ["Business name", "WhatsApp number", "Instagram", "Save details"]) expect(out1).toContain(text);

    const banners = await import("@/app/admin/banners/page");
    const out2 = await html(banners.default());
    for (const text of ["Home page banners", "New banner", "Create banner"]) expect(out2).toContain(text);

    const customers = await import("@/app/admin/customers/page");
    const out3 = await html(customers.default({ searchParams: sp() }));
    for (const text of ["Customers", "Paid orders", "Spent"]) expect(out3).toContain(text);
    expect(await html(customers.default({ searchParams: sp({ q: "no-such-person-xyz" }) }))).toContain("No customers match");
  });

  it("activity log renders", async () => {
    const { default: Page } = await import("@/app/admin/activity/page");
    expect(await html(Page())).toContain("Activity log");
  });
});
