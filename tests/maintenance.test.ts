// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { isAuthorisedCron } from "@/lib/security/cron-auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { addProductImage, createUploadTicket } from "@/services/admin/media";
import { cleanupOrphanedUploads, findOrphanedUploads, runMaintenance } from "@/services/maintenance";

describe("isAuthorisedCron", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  it("accepts exactly the right bearer token", () => expect(isAuthorisedCron(`Bearer ${secret}`, secret)).toBe(true));
  it.each([null, undefined, "", "Bearer", "Bearer wrong", secret, `bearer ${secret}`, `Bearer ${secret} `, `Bearer ${secret}x`])("rejects %j", (h) => {
    expect(isAuthorisedCron(h as string | null, secret)).toBe(false);
  });
  it("never authorises when the secret is missing or trivially short (fail closed)", () => {
    expect(isAuthorisedCron("Bearer ", "")).toBe(false);
    expect(isAuthorisedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorisedCron("Bearer abc", "abc")).toBe(false);
  });
});

const TAG = "zzt" + randomBytes(3).toString("hex");
const actor = { id: randomUUID(), email: `test-maint-${TAG}@example.test` };
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const made: string[] = [];

async function upload() {
  const t = await createUploadTicket("product-image", "image/png", PNG.length);
  made.push(t.path);
  expect((await anon.storage.from(t.bucket).uploadToSignedUrl(t.path, t.token, PNG, { contentType: "image/png" })).error).toBeNull();
  return t.path;
}

afterAll(async () => {
  await getSupabaseAdmin().storage.from("images").remove(made);
  await prisma.product.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.webhookEvent.deleteMany({ where: { id: { startsWith: `evt_${TAG}` } } });
  await prisma.auditLog.deleteMany({ where: { actorEmail: actor.email } });
  await prisma.$disconnect();
});

describe("orphaned uploads", () => {
  it("finds unreferenced files, keeps referenced ones, and respects the minimum age", async () => {
    const category = await prisma.category.findFirstOrThrow();
    const product = await prisma.product.create({ data: { name: "Maint", slug: `${TAG}-p`, categoryId: category.id, form: "RAW", description: "Maintenance test product" } });
    const kept = await upload();
    await addProductImage(product.id, kept, "kept", actor); // referenced by a product photo
    const orphan = await upload(); // uploaded but never saved anywhere

    const all = (await findOrphanedUploads(0)).map((o) => o.path);
    expect(all).toContain(orphan);
    expect(all).not.toContain(kept); // a file in use is never an orphan

    // brand-new orphan: protected by the 24h grace period (an admin may still be about to save it)
    expect((await findOrphanedUploads(24 * 3_600_000)).map((o) => o.path)).not.toContain(orphan);
    expect(await cleanupOrphanedUploads()).toBeGreaterThanOrEqual(0);
    const stillThere = await getSupabaseAdmin().storage.from("images").exists(orphan);
    expect(stillThere.data).toBe(true);
    const keptThere = await getSupabaseAdmin().storage.from("images").exists(kept);
    expect(keptThere.data).toBe(true);
  });

  it("an old orphan is reported once its age passes the limit", async () => {
    const orphan = made[made.length - 1];
    // pretend a day and an hour have passed
    const future = Date.now() + 25 * 3_600_000;
    expect((await findOrphanedUploads(24 * 3_600_000, future)).map((o) => o.path)).toContain(orphan);
  });
});

describe("runMaintenance", () => {
  it("purges old webhook records, keeps recent ones, and reports what it did", async () => {
    await prisma.webhookEvent.create({ data: { id: `evt_${TAG}_old`, provider: "razorpay", type: "x", processedAt: new Date(Date.now() - 40 * 86_400_000) } });
    await prisma.webhookEvent.create({ data: { id: `evt_${TAG}_new`, provider: "razorpay", type: "x" } });
    const r = await runMaintenance();
    expect(r.errors).toEqual([]);
    expect(r.webhookEvents).toBeGreaterThanOrEqual(1);
    expect(await prisma.webhookEvent.count({ where: { id: `evt_${TAG}_old` } })).toBe(0);
    expect(await prisma.webhookEvent.count({ where: { id: `evt_${TAG}_new` } })).toBe(1);
    expect(r).toEqual(expect.objectContaining({ rateLimitRows: expect.any(Number), orphanedFiles: expect.any(Number) }));
  });
});
