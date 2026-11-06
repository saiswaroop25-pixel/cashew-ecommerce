"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { UPLOAD_RULES, type UploadKind } from "@/lib/media/rules";
import type { FormState } from "@/lib/validators/auth";
import { deepErrors } from "@/lib/admin/forms";
import {
  addProductImage,
  addStageImage,
  createUploadTicket,
  moveProductImage,
  removeProductImage,
  removeStageMedia,
  updateProductImageAlt,
  updateStage,
} from "@/services/admin/media";
import { AdminError } from "@/services/admin/products";

const idSchema = z.string().min(1).max(40);
const pathSchema = z.string().min(10).max(120);
const KINDS = Object.keys(UPLOAD_RULES) as [UploadKind, ...UploadKind[]];

async function run(fn: () => Promise<void>, ok: string): Promise<FormState> {
  try {
    await fn();
    return { ok: true, message: ok };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("admin media action failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const refreshProduct = (id: string) => {
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/shop");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/");
};
const refreshProcess = () => {
  revalidatePath("/admin/process-flow");
  revalidatePath("/");
};

/* ───────────────────────── Upload step 1: get a one-time ticket ───────────────────────── */

export type TicketResult = { ok: true; bucket: string; path: string; token: string } | { ok: false; message: string };

export async function requestUploadAction(kind: string, contentType: string, size: number): Promise<TicketResult> {
  await requireAdmin(); // first line
  const k = z.enum(KINDS).safeParse(kind);
  if (!k.success || typeof contentType !== "string" || typeof size !== "number") return { ok: false, message: "Invalid upload request." };
  try {
    const t = await createUploadTicket(k.data, contentType, size);
    return { ok: true, ...t };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("requestUploadAction failed", e);
    return { ok: false, message: "Could not prepare the upload. Please try again." };
  }
}

/* ───────────────────────── Product photos ───────────────────────── */

export async function addProductImageAction(productId: string, path: string, alt: string): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z.object({ productId: idSchema, path: pathSchema, alt: z.string().max(200) }).safeParse({ productId, path, alt });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const result = await run(async () => void (await addProductImage(parsed.data.productId, parsed.data.path, parsed.data.alt, { id: admin.id, email: admin.email })), "Photo added.");
  refreshProduct(parsed.data.productId);
  return result;
}

export async function removeProductImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("imageId"));
  const productId = idSchema.safeParse(fd.get("productId"));
  if (!id.success || !productId.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => removeProductImage(id.data, { id: admin.id, email: admin.email }), "Photo removed.");
  refreshProduct(productId.data);
  return result;
}

export async function moveProductImageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("imageId"));
  const productId = idSchema.safeParse(fd.get("productId"));
  const dir = z.enum(["up", "down"]).safeParse(fd.get("direction"));
  if (!id.success || !productId.success || !dir.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => moveProductImage(id.data, dir.data, { id: admin.id, email: admin.email }), "Order updated.");
  refreshProduct(productId.data);
  return result;
}

export async function updateProductImageAltAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("imageId"));
  const productId = idSchema.safeParse(fd.get("productId"));
  const alt = z.string().trim().max(200, "Keep the description under 200 characters").safeParse(fd.get("alt") ?? "");
  if (!id.success || !productId.success) return { ok: false, message: "Invalid request." };
  if (!alt.success) return { ok: false, errors: { alt: alt.error.issues[0].message } };
  const result = await run(() => updateProductImageAlt(id.data, alt.data, { id: admin.id, email: admin.email }), "Description saved.");
  refreshProduct(productId.data);
  return result;
}

/* ───────────────────────── Homepage process flow ───────────────────────── */

export async function saveStageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: idSchema,
      title: z.string().trim().min(2, "Enter a title").max(80),
      summary: z.string().trim().min(5, "Describe this step in a sentence").max(300, "Keep it under 300 characters"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const result = await run(() => updateStage(id, data, { id: admin.id, email: admin.email }), "Step saved.");
  refreshProcess();
  return result;
}

export async function addStageImageAction(stageId: string, path: string, caption: string, isIllustrative: boolean): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z.object({ stageId: idSchema, path: pathSchema, caption: z.string().max(200), isIllustrative: z.boolean() }).safeParse({ stageId, path, caption, isIllustrative });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => addStageImage(parsed.data.stageId, parsed.data.path, parsed.data.caption.trim() || null, parsed.data.isIllustrative, { id: admin.id, email: admin.email }), "Image saved.");
  refreshProcess();
  return result;
}

export async function removeStageMediaAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("mediaId"));
  if (!id.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => removeStageMedia(id.data, { id: admin.id, email: admin.email }), "Image removed.");
  refreshProcess();
  return result;
}
