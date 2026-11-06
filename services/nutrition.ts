import "server-only";
import { prisma } from "@/lib/prisma";
import type { NutrientValue } from "@/lib/nutrition";

export type NutritionProfileView = {
  id: string;
  slug: string;
  name: string;
  basisGrams: number;
  sourceType: "LAB_TESTED" | "SUPPLIER" | "REFERENCE";
  sourceNote: string;
  isDemo: boolean;
  values: NutrientValue[];
  /** products that use this profile (shown so visitors can shop the item) */
  products: { name: string; slug: string }[];
};

/** All nutrition profiles with plain-number values (Decimal -> number) for client components. */
export async function listNutritionProfiles(): Promise<NutritionProfileView[]> {
  const rows = await prisma.nutritionProfile.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      values: { orderBy: { sortOrder: "asc" } },
      products: { where: { isActive: true }, select: { name: true, slug: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    basisGrams: p.basisGrams,
    sourceType: p.sourceType,
    sourceNote: p.sourceNote,
    isDemo: p.isDemo,
    products: p.products,
    values: p.values.map((v) => ({
      key: v.key,
      label: v.label,
      category: v.category,
      amount: Number(v.amount),
      unit: v.unit,
    })),
  }));
}
