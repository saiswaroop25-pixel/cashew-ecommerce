"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deepErrors } from "@/lib/admin/forms";
import { rupeesToPaise } from "@/lib/admin/text";
import { requireAdmin } from "@/lib/auth/dal";
import type { FormState } from "@/lib/validators/auth";
import { AdminError } from "@/services/admin/products";
import { advanceOrder, cancelOrder, markShipped, refundOrder, updateShipment } from "@/services/admin/orders";

const idSchema = z.string().min(1).max(40);

const shipmentSchema = z.object({
  carrier: z.string().trim().min(2, "Enter the carrier (e.g. Delhivery)").max(60),
  trackingNumber: z.string().trim().min(3, "Enter the tracking number").max(60).regex(/^[A-Za-z0-9._/-]+$/, "Tracking number can use letters, numbers and . _ / - only"),
  trackingUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => v || null)
    // only http(s): a javascript: or data: link must never reach a customer's inbox or account page
    .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "Tracking link must start with http:// or https://"),
});

/** Runs a service call, converting known business-rule errors into a form message. */
async function run(fn: () => Promise<void>, ok: string): Promise<FormState> {
  try {
    await fn();
    return { ok: true, message: ok };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("admin order action failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

function refresh(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
}

export async function advanceOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const to = z.enum(["PROCESSING", "DELIVERED"]).safeParse(fd.get("to"));
  if (!id.success || !to.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => advanceOrder(id.data, to.data, { id: admin.id, email: admin.email }), "Order updated.");
  refresh(id.data);
  return result;
}

export async function shipOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const parsed = shipmentSchema.safeParse(Object.fromEntries(fd));
  if (!id.success) return { ok: false, message: "Invalid request." };
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const result = await run(() => markShipped(id.data, parsed.data, { id: admin.id, email: admin.email }), "Marked as shipped. The customer has been emailed.");
  refresh(id.data);
  return result;
}

export async function updateShipmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  const parsed = shipmentSchema.safeParse(Object.fromEntries(fd));
  if (!id.success) return { ok: false, message: "Invalid request." };
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const result = await run(() => updateShipment(id.data, parsed.data, { id: admin.id, email: admin.email }), "Shipment details updated.");
  refresh(id.data);
  return result;
}

export async function cancelOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => cancelOrder(id.data, { id: admin.id, email: admin.email }), "Order cancelled.");
  refresh(id.data);
  return result;
}

export async function refundOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = idSchema.safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "Invalid request." };
  const paise = rupeesToPaise(String(fd.get("amount") ?? ""));
  if (paise === null) return { ok: false, errors: { amount: "Enter an amount like 250 or 250.50" } };
  const result = await run(() => refundOrder(id.data, paise, { id: admin.id, email: admin.email }), "Refund issued. The customer has been emailed.");
  refresh(id.data);
  return result;
}
