import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { declaredMatchesContent, detectFileType, objectPath, validateUploadRequest, UPLOAD_RULES, type Bucket, type UploadKind } from "@/lib/media/rules";
import { AdminError } from "@/services/admin/products";
import { logAudit, type Actor } from "@/services/admin/audit";

const UPLOAD_KINDS = Object.keys(UPLOAD_RULES) as UploadKind[];
const PATH_RE = /^(product-image|stage-image|banner-image)\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

/** Which kind an object path belongs to (its folder), or null if it is not one of ours. */
export function kindOfPath(path: string): UploadKind | null {
  if (!PATH_RE.test(path)) return null;
  return path.split("/")[0] as UploadKind;
}

/* ───────────────────────── 1. Upload ticket ───────────────────────── */

export type UploadTicket = { bucket: Bucket; path: string; token: string };

/**
 * Step 1 of an upload: the server checks the request (kind, declared type, size), chooses the object
 * path itself, and returns a one-time signed upload token. The browser then sends the file straight to
 * storage; the file never passes through our server.
 */
export async function createUploadTicket(kind: UploadKind, contentType: string, size: number): Promise<UploadTicket> {
  if (!UPLOAD_KINDS.includes(kind)) throw new AdminError("Unknown upload type.");
  const check = validateUploadRequest(kind, contentType, size);
  if (!check.ok) throw new AdminError(check.error);

  const path = objectPath(kind, randomUUID(), check.ext);
  const { data, error } = await getSupabaseAdmin().storage.from(check.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", error);
    throw new AdminError("Could not prepare the upload. Please try again.");
  }
  return { bucket: check.bucket, path, token: data.token };
}

/* ───────────────────────── 2. Verify what actually arrived ───────────────────────── */

const bucketOf = (kind: UploadKind): Bucket => UPLOAD_RULES[kind].bucket;

export async function removeObject(bucket: Bucket, path: string) {
  const { error } = await getSupabaseAdmin().storage.from(bucket).remove([path]);
  if (error) console.error("storage remove failed", bucket, path, error.message);
}

/**
 * Step 2: after the browser says it uploaded, look at the real object. It must exist, be within the size
 * limit, and its first bytes must match the type it claimed (a web page renamed to .png is rejected and
 * deleted). Returns the public URL.
 */
export async function verifyUploadedObject(path: string, expectedKind: UploadKind): Promise<{ bucket: Bucket; url: string; contentType: string }> {
  const kind = kindOfPath(path);
  if (!kind || kind !== expectedKind) throw new AdminError("That file does not belong here. Please upload it again.");
  const bucket = bucketOf(kind);
  const storage = getSupabaseAdmin().storage.from(bucket);

  const { data: info, error: infoError } = await storage.info(path);
  if (infoError || !info) throw new AdminError("The upload did not arrive. Please try again.");
  const declared = String((info as { contentType?: string }).contentType ?? "").toLowerCase();
  const size = Number((info as { size?: number }).size ?? 0);

  const rule = validateUploadRequest(kind, declared, size);
  if (!rule.ok) {
    await removeObject(bucket, path);
    throw new AdminError(rule.error);
  }

  // Look at the first bytes only (no need to download the whole file).
  const { data: signed, error: signError } = await storage.createSignedUrl(path, 60);
  if (signError || !signed) throw new AdminError("Could not check the uploaded file. Please try again.");
  const res = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-63" } });
  if (!res.ok) throw new AdminError("Could not check the uploaded file. Please try again.");
  const head = new Uint8Array(await res.arrayBuffer()).slice(0, 64);

  if (!declaredMatchesContent(declared, head)) {
    await removeObject(bucket, path);
    const real = detectFileType(head);
    throw new AdminError(
      real
        ? `The file says it is ${declared} but is actually ${real}. It was rejected.`
        : `The file's contents are not a valid ${declared}. It was rejected.`,
    );
  }
  return { bucket, url: storage.getPublicUrl(path).data.publicUrl, contentType: declared };
}

/** Public URL -> our object path (only for URLs that really point at our own buckets). */
export function pathFromPublicUrl(url: string): { bucket: Bucket; path: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const m = url.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/storage/v1/object/public/(images)/(.+)$`));
  return m && PATH_RE.test(m[2]) ? { bucket: m[1] as Bucket, path: m[2] } : null;
}

export async function removeByUrl(url: string | null | undefined) {
  const ref = url ? pathFromPublicUrl(url) : null;
  if (ref) await removeObject(ref.bucket, ref.path);
}

/* ───────────────────────── 3. Product photos ───────────────────────── */

export async function addProductImage(productId: string, path: string, alt: string, actor: Actor) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  if (!product) throw new AdminError("Product not found.");
  const { url } = await verifyUploadedObject(path, "product-image");
  const last = await prisma.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const image = await prisma.productImage.create({ data: { productId, url, alt: alt.trim() || product.name, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  await logAudit(actor, { action: "product.image.add", entity: "Product", entityId: productId, summary: `Added a photo to "${product.name}"` });
  return image;
}

export async function removeProductImage(imageId: string, actor: Actor) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId }, include: { product: { select: { name: true } } } });
  if (!image) throw new AdminError("Photo not found.");
  await prisma.productImage.delete({ where: { id: imageId } });
  await removeByUrl(image.url);
  await logAudit(actor, { action: "product.image.remove", entity: "Product", entityId: image.productId, summary: `Removed a photo from "${image.product.name}"` });
}

/** Moves a photo one place earlier/later. The first photo is the main one shown in the shop. */
export async function moveProductImage(imageId: string, direction: "up" | "down", actor: Actor) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw new AdminError("Photo not found.");
  await prisma.$transaction(async (tx) => {
    const all = await tx.productImage.findMany({ where: { productId: image.productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const i = all.findIndex((x) => x.id === imageId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    // renumber 0..n-1 so ties can never make the order ambiguous
    for (const [n, img] of all.entries()) await tx.productImage.update({ where: { id: img.id }, data: { sortOrder: n } });
  });
  await logAudit(actor, { action: "product.image.move", entity: "Product", entityId: image.productId, summary: `Moved a photo ${direction}` });
}

export async function updateProductImageAlt(imageId: string, alt: string, actor: Actor) {
  const image = await prisma.productImage.update({ where: { id: imageId }, data: { alt: alt.trim().slice(0, 200) || "Product photo" } }).catch(() => null);
  if (!image) throw new AdminError("Photo not found.");
  await logAudit(actor, { action: "product.image.alt", entity: "Product", entityId: image.productId, summary: "Updated a photo description" });
}

/* ───────────────────────── 4. Homepage process flow ───────────────────────── */

export type StageInput = { title: string; summary: string };

/** Editing a stage means a person has now written it, so it stops being flagged as placeholder text. */
export async function updateStage(stageId: string, input: StageInput, actor: Actor) {
  const stage = await prisma.manufacturingStage.update({ where: { id: stageId }, data: { ...input, isDemo: false } }).catch(() => null);
  if (!stage) throw new AdminError("Stage not found.");
  await logAudit(actor, { action: "process.stage.update", entity: "ManufacturingStage", entityId: stageId, summary: `Updated step ${stage.step}: ${stage.title}` });
}

export async function addStageImage(stageId: string, path: string, caption: string | null, isIllustrative: boolean, actor: Actor) {
  const stage = await prisma.manufacturingStage.findUnique({ where: { id: stageId }, select: { step: true, title: true } });
  if (!stage) throw new AdminError("Stage not found.");
  const { url } = await verifyUploadedObject(path, "stage-image");
  // One image per stage is shown; adding a new one replaces the old.
  const old = await prisma.manufacturingMedia.findMany({ where: { stageId, kind: "IMAGE" } });
  await prisma.$transaction([
    prisma.manufacturingMedia.deleteMany({ where: { stageId, kind: "IMAGE" } }),
    prisma.manufacturingMedia.create({ data: { stageId, kind: "IMAGE", url, caption, isIllustrative, sortOrder: 0 } }),
  ]);
  for (const o of old) await removeByUrl(o.url);
  await logAudit(actor, { action: "process.stage.image", entity: "ManufacturingStage", entityId: stageId, summary: `Set the image for step ${stage.step}: ${stage.title}` });
}

export async function removeStageMedia(mediaId: string, actor: Actor) {
  const media = await prisma.manufacturingMedia.findUnique({ where: { id: mediaId } });
  if (!media?.stageId) throw new AdminError("Image not found.");
  await prisma.manufacturingMedia.delete({ where: { id: mediaId } });
  await removeByUrl(media.url);
  await logAudit(actor, { action: "process.stage.image.remove", entity: "ManufacturingStage", entityId: media.stageId, summary: "Removed a stage image" });
}
