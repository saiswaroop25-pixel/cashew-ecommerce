import { z } from "zod";

export const FORMS = ["WHOLE", "RAW", "ROASTED", "SALTED", "FLAVOURED", "BROKEN", "PRODUCT"] as const;
export const GRADES = ["W180", "W240", "W320", "W450", "BROKEN_BB", "BROKEN_LWP", "BROKEN_SWP"] as const;
export const SORTS = ["popular", "newest", "price-asc", "price-desc"] as const;

export const FORM_LABELS: Record<(typeof FORMS)[number], string> = {
  WHOLE: "Whole",
  RAW: "Raw",
  ROASTED: "Roasted",
  SALTED: "Salted",
  FLAVOURED: "Flavoured",
  BROKEN: "Broken",
  PRODUCT: "Cashew products",
};

export const GRADE_LABELS: Record<(typeof GRADES)[number] | "NA", string> = {
  W180: "W180",
  W240: "W240",
  W320: "W320",
  W450: "W450",
  BROKEN_BB: "Broken (BB)",
  BROKEN_LWP: "Broken (LWP)",
  BROKEN_SWP: "Broken (SWP)",
  NA: "—",
};

export const PAGE_SIZE = 12;

/** Query-string -> typed filters. Invalid values are dropped, never thrown. */
const emptyToUndef = (v: unknown) => (v === "" || v === undefined ? undefined : v);

export const catalogQuerySchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(80).optional()).catch(undefined),
  category: z.preprocess(emptyToUndef, z.string().max(80).optional()).catch(undefined),
  form: z.preprocess(emptyToUndef, z.enum(FORMS).optional()).catch(undefined),
  grade: z.preprocess(emptyToUndef, z.enum(GRADES).optional()).catch(undefined),
  // Rupees in the URL, converted to paise by the service.
  minPrice: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(1_000_000).optional()).catch(undefined),
  maxPrice: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(1_000_000).optional()).catch(undefined),
  inStock: z.preprocess(emptyToUndef, z.enum(["1"]).optional()).catch(undefined),
  sort: z.preprocess(emptyToUndef, z.enum(SORTS).default("popular")).catch("popular"),
  page: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(500).default(1)).catch(1),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(
  raw: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  return catalogQuerySchema.parse(flat);
}
