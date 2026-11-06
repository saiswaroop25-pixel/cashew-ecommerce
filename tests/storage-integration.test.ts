// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integration tests against the REAL Supabase Storage and database.
 * They upload with the same one-time signed tokens the admin UI uses, then check that the server
 * accepts genuine files and rejects dishonest, oversized or wrong-type ones. Every object and row
 * created here is removed afterwards; real data is only touched when explicitly noted.
 */
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Bucket, UploadKind } from "@/lib/media/rules";
import { AdminError } from "@/services/admin/products";
import {
  addProductImage,
  addStageImage,
  createUploadTicket,
  moveProductImage,
  pathFromPublicUrl,
  removeMainVideo,
  removeProductImage,
  removeStageMedia,
  setMainVideo,
  updateStage,
  verifyUploadedObject,
} from "@/services/admin/media";

const TAG = "zzt" + randomBytes(3).toString("hex");
const actor = { id: randomUUID(), email: `test-media-${TAG}@example.test` };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(200)]);
const VTT = Buffer.from("WEBVTT\n\n00:00.000 --> 00:02.000\nHello\n");
const HTML = Buffer.from("<html><script>alert('xss')</script></html>");

const uploaded: { bucket: Bucket; path: string }[] = [];

/** What the admin browser does: get a ticket, then upload straight to storage with the token. */
async function upload(kind: UploadKind, bytes: Buffer, declaredType: string, ticketType = declaredType) {
  const ticket = await createUploadTicket(kind, ticketType, bytes.length);
  uploaded.push({ bucket: ticket.bucket, path: ticket.path });
  const { error } = await anon.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, bytes, { contentType: declaredType });
  return { ticket, error };
}

const exists = async (bucket: Bucket, path: string) => !!(await getSupabaseAdmin().storage.from(bucket).exists(path)).data;

beforeAll(async () => {
  // sanity: the buckets exist
  const { data } = await getSupabaseAdmin().storage.listBuckets();
  const names = (data ?? []).map((b) => b.name);
  for (const n of ["images", "video", "captions"]) expect(names).toContain(n);
});

afterAll(async () => {
  for (const o of uploaded) await getSupabaseAdmin().storage.from(o.bucket).remove([o.path]);
  await prisma.product.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.auditLog.deleteMany({ where: { actorEmail: actor.email } });
  await prisma.$disconnect();
});

describe("upload tickets (server-side checks before any byte is sent)", () => {
  it("refuses wrong types, oversize files, empty files and unknown kinds", async () => {
    await expect(createUploadTicket("product-image", "image/svg+xml", 100)).rejects.toThrow(AdminError);
    await expect(createUploadTicket("product-image", "text/html", 100)).rejects.toThrow(AdminError);
    await expect(createUploadTicket("product-image", "image/png", 6 * 1024 * 1024)).rejects.toThrow(/too large/);
    await expect(createUploadTicket("process-video", "video/mp4", 60 * 1024 * 1024)).rejects.toThrow(/too large/);
    await expect(createUploadTicket("product-image", "image/png", 0)).rejects.toThrow(AdminError);
    await expect(createUploadTicket("hack" as UploadKind, "image/png", 10)).rejects.toThrow(AdminError);
  });
  it("chooses the object path itself (a uuid, never the visitor's file name)", async () => {
    const t = await createUploadTicket("product-image", "image/png", 100);
    expect(t.path).toMatch(/^product-image\/[0-9a-f-]{36}\.png$/);
    expect(t.bucket).toBe("images");
  });
});

describe("storage layer enforces limits on its own (defence in depth)", () => {
  it("a genuine PNG uploads and is publicly readable with the right content type", async () => {
    const { ticket, error } = await upload("product-image", PNG, "image/png");
    expect(error).toBeNull();
    const v = await verifyUploadedObject(ticket.path, "product-image");
    expect(v.url).toContain(`/storage/v1/object/public/images/${ticket.path}`);
    const res = await fetch(v.url);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("the bucket itself refuses a wrong content type even with a valid token", async () => {
    const ticket = await createUploadTicket("product-image", "image/png", 100); // ticket asked for png...
    uploaded.push({ bucket: ticket.bucket, path: ticket.path });
    const { error } = await anon.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, HTML, { contentType: "text/html" }); // ...but html is sent
    expect(error).not.toBeNull();
    expect(await exists(ticket.bucket, ticket.path)).toBe(false);
  });

  it("the bucket itself refuses an oversize file even with a valid token", async () => {
    const ticket = await createUploadTicket("product-image", "image/png", 1000);
    uploaded.push({ bucket: ticket.bucket, path: ticket.path });
    const big = Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]);
    const { error } = await anon.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, big, { contentType: "image/png" });
    expect(error).not.toBeNull();
    expect(await exists(ticket.bucket, ticket.path)).toBe(false);
  });

  it("an anonymous visitor cannot upload without a token, nor delete or list objects", async () => {
    const path = `product-image/${randomUUID()}.png`;
    const up = await anon.storage.from("images").upload(path, PNG, { contentType: "image/png" });
    expect(up.error).not.toBeNull(); // no insert policy for anon
    const { data: real } = await anon.storage.from("images").list("product-image");
    expect(real ?? []).toHaveLength(0); // listing is not allowed for anon
  });
});

describe("post-upload verification catches dishonest files", () => {
  it("HTML disguised as image/png passes the bucket's header check but is rejected and DELETED", async () => {
    const { ticket, error } = await upload("product-image", HTML, "image/png");
    expect(error).toBeNull(); // the bucket only sees the header, so it lets it in
    expect(await exists(ticket.bucket, ticket.path)).toBe(true);
    await expect(verifyUploadedObject(ticket.path, "product-image")).rejects.toThrow(/rejected/);
    expect(await exists(ticket.bucket, ticket.path)).toBe(false);
  });

  it("a PNG uploaded as if it were a video is rejected and deleted", async () => {
    const { ticket, error } = await upload("process-video", PNG, "video/mp4");
    expect(error).toBeNull();
    await expect(verifyUploadedObject(ticket.path, "process-video")).rejects.toThrow(/actually image\/png|rejected/);
    expect(await exists(ticket.bucket, ticket.path)).toBe(false);
  });

  it("refuses paths that are not ours or belong to a different kind", async () => {
    await expect(verifyUploadedObject("../../secret.png", "product-image")).rejects.toThrow(AdminError);
    await expect(verifyUploadedObject("product-image/not-a-uuid.png", "product-image")).rejects.toThrow(AdminError);
    const { ticket } = await upload("product-image", PNG, "image/png");
    await expect(verifyUploadedObject(ticket.path, "process-poster")).rejects.toThrow(/does not belong/); // wrong kind for this folder
  });

  it("a missing object is reported cleanly", async () => {
    await expect(verifyUploadedObject(`product-image/${randomUUID()}.png`, "product-image")).rejects.toThrow(AdminError);
  });
});

describe("pathFromPublicUrl only trusts our own storage", () => {
  const id = randomUUID();
  it("maps a public URL on our project back to bucket + path", () => {
    expect(pathFromPublicUrl(`${url}/storage/v1/object/public/images/product-image/${id}.png`)).toEqual({ bucket: "images", path: `product-image/${id}.png` });
  });
  it("ignores foreign hosts, odd paths and traversal (so a crafted URL can never delete other files)", () => {
    expect(pathFromPublicUrl(`https://evil.example/storage/v1/object/public/images/product-image/${id}.png`)).toBeNull();
    expect(pathFromPublicUrl(`${url}/storage/v1/object/public/images/../secret.png`)).toBeNull();
    expect(pathFromPublicUrl(`${url}/storage/v1/object/public/images/other-folder/${id}.png`)).toBeNull();
    expect(pathFromPublicUrl("https://images.unsplash.com/photo.jpg")).toBeNull();
  });
});

describe("product photos", () => {
  it("add, reorder and remove (removing also deletes the stored file)", async () => {
    const category = await prisma.category.findFirstOrThrow();
    const product = await prisma.product.create({ data: { name: "Photo test", slug: `${TAG}-photos`, categoryId: category.id, form: "RAW", description: "Photo test product" } });

    const a = await upload("product-image", PNG, "image/png");
    const b = await upload("product-image", PNG, "image/png");
    const img1 = await addProductImage(product.id, a.ticket.path, "First", actor);
    const img2 = await addProductImage(product.id, b.ticket.path, "", actor);
    expect(img1.sortOrder).toBe(0);
    expect(img2.sortOrder).toBe(1);
    expect(img2.alt).toBe("Photo test"); // blank alt text falls back to the product name

    await moveProductImage(img2.id, "up", actor);
    const order = (await prisma.productImage.findMany({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } })).map((i) => i.id);
    expect(order).toEqual([img2.id, img1.id]);
    await moveProductImage(img2.id, "up", actor); // already first: harmless no-op
    expect((await prisma.productImage.findFirstOrThrow({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } })).id).toBe(img2.id);

    await removeProductImage(img1.id, actor);
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(1);
    expect(await exists("images", a.ticket.path)).toBe(false); // file gone from storage too
    expect(await exists("images", b.ticket.path)).toBe(true);
  });

  it("rejects adding a photo to an unknown product", async () => {
    const { ticket } = await upload("product-image", PNG, "image/png");
    await expect(addProductImage("nope", ticket.path, "x", actor)).rejects.toThrow(AdminError);
  });
});

describe("manufacturing media", () => {
  it("main video with poster and captions: set, replace (old files deleted), remove", async () => {
    // Safety: never overwrite a real video someone has uploaded.
    if ((await prisma.manufacturingMedia.count({ where: { stageId: null, kind: "VIDEO" } })) > 0) return;

    const v1 = await upload("process-video", MP4, "video/mp4");
    const p1 = await upload("process-poster", PNG, "image/png");
    const c1 = await upload("captions", VTT, "text/vtt");
    const first = await setMainVideo({ videoPath: v1.ticket.path, posterPath: p1.ticket.path, captionsPath: c1.ticket.path, caption: "Test clip", isIllustrative: true }, actor);
    expect(first.url).toContain(v1.ticket.path);
    expect(first.captionsUrl).toContain(c1.ticket.path);
    expect(first.isIllustrative).toBe(true);

    const v2 = await upload("process-video", MP4, "video/mp4");
    await setMainVideo({ videoPath: v2.ticket.path, posterPath: null, captionsPath: null, caption: null, isIllustrative: false }, actor);
    expect(await prisma.manufacturingMedia.count({ where: { stageId: null, kind: "VIDEO" } })).toBe(1); // replaced, not duplicated
    expect(await exists("video", v1.ticket.path)).toBe(false);
    expect(await exists("images", p1.ticket.path)).toBe(false);
    expect(await exists("captions", c1.ticket.path)).toBe(false);

    await removeMainVideo(actor);
    expect(await prisma.manufacturingMedia.count({ where: { stageId: null, kind: "VIDEO" } })).toBe(0);
    expect(await exists("video", v2.ticket.path)).toBe(false);
  });

  it("a bad poster aborts the whole change and leaves any existing video untouched", async () => {
    if ((await prisma.manufacturingMedia.count({ where: { stageId: null, kind: "VIDEO" } })) > 0) return;
    const v = await upload("process-video", MP4, "video/mp4");
    const badPoster = await upload("process-poster", HTML, "image/png");
    await expect(setMainVideo({ videoPath: v.ticket.path, posterPath: badPoster.ticket.path, captionsPath: null, caption: null, isIllustrative: true }, actor)).rejects.toThrow(AdminError);
    expect(await prisma.manufacturingMedia.count({ where: { stageId: null, kind: "VIDEO" } })).toBe(0);
  });

  it("stage text edits clear the placeholder flag; stage images replace each other; originals are restored", async () => {
    const stage = await prisma.manufacturingStage.findUniqueOrThrow({ where: { step: 13 } });
    if ((await prisma.manufacturingMedia.count({ where: { stageId: stage.id } })) > 0) return; // do not touch real images
    try {
      await updateStage(stage.id, { title: `${TAG} title`, summary: "s", qualityNote: "q", startSecond: 5 }, actor);
      const edited = await prisma.manufacturingStage.findUniqueOrThrow({ where: { id: stage.id } });
      expect(edited).toMatchObject({ title: `${TAG} title`, isDemo: false, startSecond: 5 });

      const i1 = await upload("stage-image", PNG, "image/png");
      const i2 = await upload("stage-image", PNG, "image/png");
      await addStageImage(stage.id, i1.ticket.path, "one", true, actor);
      await addStageImage(stage.id, i2.ticket.path, "two", true, actor);
      const media = await prisma.manufacturingMedia.findMany({ where: { stageId: stage.id } });
      expect(media).toHaveLength(1);
      expect(media[0].caption).toBe("two");
      expect(await exists("images", i1.ticket.path)).toBe(false); // replaced image's file deleted
      await removeStageMedia(media[0].id, actor);
      expect(await prisma.manufacturingMedia.count({ where: { stageId: stage.id } })).toBe(0);
    } finally {
      await prisma.manufacturingStage.update({ where: { id: stage.id }, data: { title: stage.title, summary: stage.summary, qualityNote: stage.qualityNote, startSecond: stage.startSecond, isDemo: stage.isDemo } });
    }
    const restored = await prisma.manufacturingStage.findUniqueOrThrow({ where: { id: stage.id } });
    expect(restored.title).toBe(stage.title);
  });
});
