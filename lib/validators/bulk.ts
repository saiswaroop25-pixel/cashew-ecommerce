import { z } from "zod";
import { FORMS, GRADES } from "@/lib/validators/catalog";

export const PACKAGING_OPTIONS = {
  NO_PREFERENCE: "No preference",
  RETAIL_PACKS: "Retail packs (up to 1 kg)",
  BULK_BAGS: "Bulk bags / cartons (5–25 kg)",
  VACUUM: "Vacuum packed",
  CUSTOM: "Custom / private label",
} as const;
export type PackagingKey = keyof typeof PACKAGING_OPTIONS;
const PACKAGING_KEYS = Object.keys(PACKAGING_OPTIONS) as [PackagingKey, ...PackagingKey[]];

export const VARIETY_OPTIONS = [...FORMS, "OTHER"] as const;
export const GRADE_OPTIONS = [...GRADES, "ANY"] as const;

/** Business phone: optional +, then 8-15 digits (spaces, dashes and brackets are ignored). */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+?\d{8,15}$/, "Enter a valid phone number"));

const optionalPhone = z
  .union([z.literal(""), phone])
  .optional()
  .transform((v) => v || null);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Please keep this under ${max} characters`).optional().transform((v) => v || null);

/**
 * `today` is passed in (rather than read here) so the rule "delivery date must not be in the
 * past" is deterministic in tests and compatible with Next's prerender rules.
 */
export function makeBulkEnquirySchema(today: Date) {
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return z.object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    companyName: z.string().trim().min(2, "Enter your company name").max(100),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
    phone,
    whatsapp: optionalPhone,
    location: z.string().trim().min(2, "Enter your city / location").max(120),
    variety: z.enum(VARIETY_OPTIONS, { error: "Select a variety" }),
    grade: z.enum(GRADE_OPTIONS, { error: "Select a grade (or 'Any')" }),
    quantityKg: z.coerce
      .number({ error: "Enter the quantity in kg" })
      .int("Enter a whole number of kg")
      .min(1, "Quantity must be at least 1 kg")
      .max(1_000_000, "Quantity is too large"),
    packaging: z.enum(PACKAGING_KEYS, { error: "Select a packaging preference" }),
    expectedDelivery: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")
      .refine((v) => v === null || !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Enter a valid date")
      .refine((v) => v === null || new Date(`${v}T00:00:00Z`) >= startOfToday, "Delivery date cannot be in the past")
      .transform((v) => (v === null ? null : new Date(`${v}T00:00:00Z`))),
    requirements: optionalText(1000),
    consent: z.literal("on", { error: "Please confirm that we may contact you about this enquiry" }),
    // Honeypot: real people never see or fill this field.
    website: z.string().max(0).optional(),
  });
}

export type BulkEnquiryInput = z.infer<ReturnType<typeof makeBulkEnquirySchema>>;

/** "BLK-2026-004217" */
export function formatReference(year: number, serial: number): string {
  return `BLK-${year}-${String(serial).padStart(6, "0")}`;
}
