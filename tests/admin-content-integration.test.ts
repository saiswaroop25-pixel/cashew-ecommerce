// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Integration tests (real database + real storage) for company details, banners and the customers list.
 * Real data is protected: saved company details are backed up and restored, and only rows/files created
 * here (unique TAG) are ever removed.
 */
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { bannerSchema, siteSettingsSchema } from "@/lib/validators/admin-content";
import { createBanner, deleteBanner, getSavedSiteSettings, listAdminBanners, moveBanner, removeBannerImage, saveSiteSettings, setBannerImage, updateBanner } from "@/services/admin/content";
import { listCustomers } from "@/services/admin/customers";
import { createUploadTicket } from "@/services/admin/media";
import { AdminError } from "@/services/admin/products";
import { getActiveBanners } from "@/services/banners";
import { getSite, parseSavedSettings } from "@/services/site";

const TAG = "zzt" + randomBytes(3).toString("hex");
const actor = { id: randomUUID(), email: `test-content-${TAG}@example.test` };
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const uploaded: string[] = [];
let originalSettings: unknown = null;
let hadSettings = false;

const banner = (over: Record<string, unknown> = {}) => bannerSchema.parse({ title: `${TAG} banner`, ...over });
const exists = async (path: string) => !!(await getSupabaseAdmin().storage.from("images").exists(path)).data;
async function upload(kind: "banner-image" | "product-image") {
  const t = await createUploadTicket(kind, "image/png", PNG.length);
  uploaded.push(t.path);
  const { error } = await anon.storage.from(t.bucket).uploadToSignedUrl(t.path, t.token, PNG, { contentType: "image/png" });
  expect(error).toBeNull();
  return t.path;
}

beforeAll(async () => {
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  hadSettings = !!row;
  originalSettings = row?.value ?? null;
});

afterAll(async () => {
  // restore the company details exactly as they were
  if (hadSettings) await prisma.siteSetting.update({ where: { key: "site" }, data: { value: originalSettings as never } });
  else await prisma.siteSetting.deleteMany({ where: { key: "site" } });
  await getSupabaseAdmin().storage.from("images").remove(uploaded);
  await prisma.banner.deleteMany({ where: { title: { startsWith: TAG } } });
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: `ZZT-${TAG}`.toUpperCase() } } });
  await prisma.profile.deleteMany({ where: { email: { startsWith: TAG } } });
  await prisma.auditLog.deleteMany({ where: { actorEmail: actor.email } });
  await prisma.$disconnect();
});

describe("company & contact details", () => {
  it("saves, reads back, and the site resolves admin values over environment defaults", async () => {
    const input = siteSettingsSchema.parse({ name: `${TAG} Cashews`, email: "hello@test.example", whatsapp: "+91 98765 43210", address: "1 Test Road\nMangaluru", instagramUrl: "https://instagram.com/test" });
    await saveSiteSettings(input, actor);
    expect(await getSavedSiteSettings()).toMatchObject({ name: `${TAG} Cashews`, email: "hello@test.example", whatsapp: "919876543210", address: "1 Test Road\nMangaluru" });

    const site = await getSite(); // the cached public reader (cache directives are no-ops in tests)
    expect(site.name).toBe(`${TAG} Cashews`);
    expect(site.whatsapp).toBe("919876543210");
    expect(site.instagramUrl).toBe("https://instagram.com/test");
  });

  it("a second save replaces the first (one row, no duplicates)", async () => {
    await saveSiteSettings(siteSettingsSchema.parse({ name: `${TAG} Second` }), actor);
    expect(await prisma.siteSetting.count({ where: { key: "site" } })).toBe(1);
    expect((await getSavedSiteSettings()).name).toBe(`${TAG} Second`);
    expect((await getSavedSiteSettings()).email).toBe(""); // fields not submitted are cleared, not kept
  });

  it("a corrupted saved value never breaks the site: it falls back to defaults", async () => {
    for (const bad of [null, [], "text", 42, { name: 123, email: ["x"] }]) expect(parseSavedSettings(bad)).toEqual({});
    expect(parseSavedSettings({ name: "OK", evil: "<script>", email: 5 })).toEqual({ name: "OK" }); // unknown / wrong-type keys dropped
  });

  it("is recorded in the activity log", async () => {
    expect(await prisma.auditLog.count({ where: { actorEmail: actor.email, action: "settings.site" } })).toBeGreaterThan(0);
  });
});

describe("banners", () => {
  it("creates in order, reorders, hides, and only active ones are public", async () => {
    const a = await createBanner(banner({ title: `${TAG} A` }), actor);
    const b = await createBanner(banner({ title: `${TAG} B`, linkUrl: "/shop", linkLabel: "Shop" }), actor);
    const c = await createBanner(banner({ title: `${TAG} C` }), actor);
    const mine = async () => (await listAdminBanners()).filter((x) => x.title.startsWith(TAG)).map((x) => x.title.slice(-1));
    expect(await mine()).toEqual(["A", "B", "C"]);

    await moveBanner(c.id, "up", actor);
    expect(await mine()).toEqual(["A", "C", "B"]);
    await moveBanner(a.id, "up", actor); // already first: harmless no-op
    expect(await mine()).toEqual(["A", "C", "B"]);
    await moveBanner(b.id, "down", actor); // already last: harmless no-op
    expect(await mine()).toEqual(["A", "C", "B"]);

    await updateBanner(c.id, banner({ title: `${TAG} C`, isActive: false }), actor);
    expect((await listAdminBanners()).find((x) => x.id === c.id)?.isActive).toBe(false);
    const publicTitles = (await getActiveBanners()).map((x) => x.title);
    expect(publicTitles).not.toContain(`${TAG} C`); // hidden banners never reach visitors
    expect((await getActiveBanners()).length).toBeLessThanOrEqual(3); // a highlight strip, not a wall
  });

  it("unknown banners give clean errors", async () => {
    await expect(updateBanner("nope", banner(), actor)).rejects.toThrow(AdminError);
    await expect(deleteBanner("nope", actor)).rejects.toThrow(AdminError);
    await expect(moveBanner("nope", "up", actor)).rejects.toThrow(AdminError);
  });

  it("image: set, replace (old file deleted), remove, and wrong-kind files are refused", async () => {
    const created = await createBanner(banner({ title: `${TAG} Img` }), actor);
    const p1 = await upload("banner-image");
    await setBannerImage(created.id, p1, actor);
    expect((await listAdminBanners()).find((x) => x.id === created.id)?.imageUrl).toContain(p1);

    const p2 = await upload("banner-image");
    await setBannerImage(created.id, p2, actor);
    expect(await exists(p1)).toBe(false); // replaced: the old file is gone
    expect(await exists(p2)).toBe(true);

    const wrongKind = await upload("product-image"); // a product photo cannot be used as a banner image
    await expect(setBannerImage(created.id, wrongKind, actor)).rejects.toThrow(/does not belong/);

    await removeBannerImage(created.id, actor);
    expect((await listAdminBanners()).find((x) => x.id === created.id)?.imageUrl).toBeNull();
    expect(await exists(p2)).toBe(false);
  });

  it("deleting a banner also deletes its stored image", async () => {
    const created = await createBanner(banner({ title: `${TAG} Del` }), actor);
    const p = await upload("banner-image");
    await setBannerImage(created.id, p, actor);
    await deleteBanner(created.id, actor);
    expect(await prisma.banner.findUnique({ where: { id: created.id } })).toBeNull();
    expect(await exists(p)).toBe(false);
  });
});

describe("customers list", () => {
  it("counts paid orders and money spent per customer (unpaid and cancelled orders do not count)", async () => {
    const id = randomUUID();
    const email = `${TAG}-buyer@example.test`;
    await prisma.profile.create({ data: { id, email, fullName: "Test Customer", phone: "9876543210" } });
    const mk = (n: number, status: "PAID" | "DELIVERED" | "PENDING_PAYMENT" | "CANCELLED", total: number) =>
      prisma.order.create({
        data: {
          orderNumber: `ZZT-${TAG}-${n}`.toUpperCase(), accessToken: randomBytes(8).toString("hex"), profileId: id, status, email, customerName: "Test Customer", phone: "9876543210",
          shipLine1: "x", shipCity: "y", shipState: "z", shipPostal: "575001", subtotalPaise: total, totalPaise: total,
        },
      });
    await mk(1, "PAID", 10000);
    await mk(2, "DELIVERED", 25000);
    await mk(3, "PENDING_PAYMENT", 99999);
    await mk(4, "CANCELLED", 77777);

    const r = await listCustomers({ q: `${TAG}-buyer` });
    expect(r.total).toBe(1);
    expect(r.customers[0]).toMatchObject({ email, fullName: "Test Customer", role: "CUSTOMER", paidOrders: 2, spentPaise: 35000 });
  });

  it("search matches name, email and phone, and is safe against injection characters", async () => {
    expect((await listCustomers({ q: "Test Customer" })).customers.some((c) => c.email.startsWith(TAG))).toBe(true);
    expect((await listCustomers({ q: "9876543210" })).customers.some((c) => c.email.startsWith(TAG))).toBe(true);
    expect((await listCustomers({ q: "'; DROP TABLE \"Profile\"; --" })).total).toBe(0);
    expect(await prisma.profile.count()).toBeGreaterThan(0); // table still there
    expect((await listCustomers({ q: "%" })).total).toBeGreaterThanOrEqual(0); // wildcard char does not crash
  });

  it("paginates and never returns more than a page", async () => {
    const r = await listCustomers({ page: 1 });
    expect(r.customers.length).toBeLessThanOrEqual(25);
    expect(r.totalPages).toBeGreaterThanOrEqual(1);
    expect((await listCustomers({ page: 9999 })).customers).toHaveLength(0); // past the end: empty, not an error
  });
});
