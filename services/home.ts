import "server-only";
import { prisma } from "@/lib/prisma";

const HIGHLIGHT_KEYS = ["protein", "fibre", "magnesium", "copper"];

/** A few headline nutrients from the first product that has a nutrition profile. */
export async function getNutritionHighlights() {
  const product = await prisma.product.findFirst({
    where: { isActive: true, nutritionProfileId: { not: null } },
    orderBy: { popularity: "desc" },
    select: {
      slug: true,
      nutritionProfile: {
        select: {
          basisGrams: true,
          sourceType: true,
          sourceNote: true,
          values: { where: { key: { in: HIGHLIGHT_KEYS } }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  const profile = product?.nutritionProfile;
  if (!product || !profile) return null;
  return {
    productSlug: product.slug,
    basisGrams: profile.basisGrams,
    sourceType: profile.sourceType,
    sourceNote: profile.sourceNote,
    values: profile.values.map((v) => ({
      key: v.key,
      label: v.label,
      amount: v.amount.toString(),
      unit: v.unit,
    })),
  };
}

export async function getManufacturingStages() {
  return prisma.manufacturingStage.findMany({
    orderBy: { step: "asc" },
    select: { step: true, title: true, summary: true, isDemo: true },
  });
}
