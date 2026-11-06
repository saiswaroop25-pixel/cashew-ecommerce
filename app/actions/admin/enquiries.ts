"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deepErrors } from "@/lib/admin/forms";
import { rupeesToPaise } from "@/lib/admin/text";
import { requireAdmin } from "@/lib/auth/dal";
import type { FormState } from "@/lib/validators/auth";
import { AdminError } from "@/services/admin/products";
import {
  ENQUIRY_STATUSES,
  createQuotation,
  sendQuotation,
  setQuotationStatus,
  updateEnquiry,
} from "@/services/admin/enquiries";

const idSchema = z.string().min(1).max(40);

async function run(fn: () => Promise<void>, ok: string): Promise<FormState> {
  try {
    await fn();
    return { ok: true, message: ok };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, message: e.message };
    console.error("admin enquiry action failed", e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

function refresh(id: string) {
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin");
}

export async function updateEnquiryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: idSchema,
      status: z.enum(ENQUIRY_STATUSES as [string, ...string[]]),
      adminNotes: z.string().trim().max(2000, "Notes can be up to 2000 characters").optional().transform((v) => v || null),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  const { id, status, adminNotes } = parsed.data;
  const result = await run(
    () => updateEnquiry(id, { status: status as (typeof ENQUIRY_STATUSES)[number], adminNotes }, { id: admin.id, email: admin.email }),
    "Enquiry updated.",
  );
  refresh(id);
  return result;
}

/** Two submit buttons: name="intent" value="send" or "draft". */
export async function createQuotationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const price = rupeesToPaise(String(fd.get("pricePerKg") ?? ""));
  const parsed = z
    .object({
      id: idSchema,
      quantityKg: z.coerce.number({ error: "Enter the quantity" }).int("Whole kg only").min(1, "At least 1 kg").max(1_000_000),
      validUntil: z
        .string()
        .trim()
        .optional()
        .transform((v) => v || null)
        .refine((v) => v === null || !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Enter a valid date")
        .transform((v) => (v === null ? null : new Date(`${v}T00:00:00Z`))),
      terms: z.string().trim().max(2000, "Terms can be up to 2000 characters").optional().transform((v) => v || null),
      intent: z.enum(["send", "draft"]),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: deepErrors(parsed.error) };
  if (price === null || price <= 0) return { ok: false, errors: { pricePerKg: "Enter a price per kg like 750 or 749.50" } };

  const { id, quantityKg, validUntil, terms, intent } = parsed.data;
  const send = intent === "send";
  const result = await run(
    async () => {
      await createQuotation(id, { pricePerKgPaise: price, quantityKg, validUntil, terms }, send, { id: admin.id, email: admin.email });
    },
    send ? "Quotation sent to the buyer." : "Draft saved.",
  );
  refresh(id);
  return result;
}

export async function sendQuotationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const quotationId = idSchema.safeParse(fd.get("quotationId"));
  const enquiryId = idSchema.safeParse(fd.get("id"));
  if (!quotationId.success || !enquiryId.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => sendQuotation(quotationId.data, { id: admin.id, email: admin.email }), "Quotation sent to the buyer.");
  refresh(enquiryId.data);
  return result;
}

export async function setQuotationStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const quotationId = idSchema.safeParse(fd.get("quotationId"));
  const enquiryId = idSchema.safeParse(fd.get("id"));
  const status = z.enum(["ACCEPTED", "REJECTED", "EXPIRED"]).safeParse(fd.get("status"));
  if (!quotationId.success || !enquiryId.success || !status.success) return { ok: false, message: "Invalid request." };
  const result = await run(() => setQuotationStatus(quotationId.data, status.data, { id: admin.id, email: admin.email }), "Quotation updated.");
  refresh(enquiryId.data);
  return result;
}
