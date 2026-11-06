import { z } from "zod";
import { rupeesToPaise, slugify } from "@/lib/admin/text";
import { FORMS, GRADES } from "@/lib/validators/catalog";

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const paise = rupeesToPaise(v);
      if (paise === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be an amount like 499 or 499.50` });
        return z.NEVER;
      }
      return paise;
    });

export const variantSchema = z.object({
  /** present for an existing pack size, absent for a new one */
  id: z.string().max(40).optional(),
  label: z.string().trim().min(1, "Enter a pack label (e.g. 250 g)").max(30),
  weightGrams: z.coerce.number({ error: "Enter the weight in grams" }).int().min(1).max(1_000_000),
  price: money("Price").refine((p) => p > 0, "Price must be more than zero"),
  compareAt: z.union([z.literal(""), money("Compare-at price")]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  sku: z.string().trim().min(2, "Enter a SKU").max(60).regex(/^[A-Za-z0-9._-]+$/, "SKU can use letters, numbers, . _ - only"),
  quantity: z.coerce.number({ error: "Enter the stock quantity" }).int("Whole units only").min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(10),
  isActive: z.boolean().default(true),
});
export type VariantInput = z.infer<typeof variantSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name").max(120),
    slug: z.string().trim().max(80).optional().transform((v) => v ?? ""),
    categoryId: z.string().min(1, "Choose a category").max(40),
    form: z.enum(FORMS, { error: "Choose a type" }),
    grade: z.enum([...GRADES, "NA"], { error: "Choose a grade" }),
    shortDescription: optionalText(200),
    description: z.string().trim().min(10, "Write a description (at least a sentence)").max(5000),
    origin: optionalText(120),
    ingredients: optionalText(500),
    allergenInfo: optionalText(500),
    storageInstruction: optionalText(500),
    deliveryInfo: optionalText(500),
    nutritionProfileId: z.string().max(40).optional().transform((v) => v || null),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seoTitle: optionalText(70),
    seoDescription: optionalText(160),
    variants: z.array(variantSchema).min(1, "Add at least one pack size").max(20),
  })
  .transform((p) => ({ ...p, slug: slugify(p.slug || p.name) }))
  .refine((p) => p.slug.length > 0, { path: ["slug"], message: "Could not make a web address from this name" })
  .superRefine((p, ctx) => {
    const seenSku = new Set<string>();
    const seenWeight = new Set<number>();
    p.variants.forEach((v, i) => {
      const sku = v.sku.toUpperCase();
      if (seenSku.has(sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Two pack sizes share this SKU" });
      seenSku.add(sku);
      if (seenWeight.has(v.weightGrams)) ctx.addIssue({ code: "custom", path: ["variants", i, "weightGrams"], message: "Two pack sizes have the same weight" });
      seenWeight.add(v.weightGrams);
      if (v.compareAt !== null && v.compareAt <= v.price) ctx.addIssue({ code: "custom", path: ["variants", i, "compareAt"], message: "Compare-at price must be higher than the price" });
    });
  });

export type ProductInput = z.infer<typeof productSchema>;

/** FormData (plain fields + a JSON `variants` field) -> raw object for the schema. */
export function productFormToRaw(fd: FormData): Record<string, unknown> {
  const get = (k: string) => (fd.get(k) === null ? undefined : String(fd.get(k)));
  let variants: unknown = [];
  try {
    variants = JSON.parse(get("variants") ?? "[]");
  } catch {
    variants = [];
  }
  return {
    name: get("name"),
    slug: get("slug"),
    categoryId: get("categoryId"),
    form: get("form"),
    grade: get("grade"),
    shortDescription: get("shortDescription"),
    description: get("description"),
    origin: get("origin"),
    ingredients: get("ingredients"),
    allergenInfo: get("allergenInfo"),
    storageInstruction: get("storageInstruction"),
    deliveryInfo: get("deliveryInfo"),
    nutritionProfileId: get("nutritionProfileId"),
    isFeatured: fd.get("isFeatured") === "on",
    isActive: fd.get("isActive") === "on",
    seoTitle: get("seoTitle"),
    seoDescription: get("seoDescription"),
    variants,
  };
}
