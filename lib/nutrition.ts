/**
 * Pure nutrition helpers. Nothing here invents data: every number comes from a stored
 * NutritionProfile (per `basisGrams`) and is only scaled or compared.
 */

export type NutrientValue = {
  key: string;
  label: string;
  category: "MACRO" | "MINERAL" | "VITAMIN";
  /** amount per profile basis (usually 100 g) */
  amount: number;
  unit: string;
};

export const SERVING_PRESETS = [100, 50, 30] as const;
export const MIN_SERVING_G = 1;
export const MAX_SERVING_G = 500;

export function clampServing(grams: number): number {
  if (!Number.isFinite(grams)) return 30;
  return Math.min(MAX_SERVING_G, Math.max(MIN_SERVING_G, Math.round(grams)));
}

/** Scale per-basis amounts to a serving size. */
export function scaleToServing<T extends { amount: number }>(values: T[], basisGrams: number, servingGrams: number): T[] {
  const factor = servingGrams / basisGrams;
  return values.map((v) => ({ ...v, amount: v.amount * factor }));
}

/** Readable amount: fewer decimals for big numbers, trailing zeros trimmed. */
export function formatAmount(n: number): string {
  const digits = n >= 100 ? 0 : n >= 10 ? 1 : n >= 1 ? 2 : 3;
  return String(Number(n.toFixed(digits)));
}

/**
 * Approximate share of energy from each macronutrient using the general Atwater factors
 * (protein 4, carbohydrate 4, fat 9 kcal/g). An approximation for illustration, not a lab value.
 */
export function energyShares(values: Pick<NutrientValue, "key" | "amount">[]) {
  const g = (key: string) => values.find((v) => v.key === key)?.amount ?? 0;
  const kcal = { protein: g("protein") * 4, fat: g("fat") * 9, carbohydrate: g("carbohydrate") * 4 };
  const total = kcal.protein + kcal.fat + kcal.carbohydrate;
  if (total === 0) return null;
  return {
    protein: { kcal: kcal.protein, percent: (kcal.protein / total) * 100 },
    fat: { kcal: kcal.fat, percent: (kcal.fat / total) * 100 },
    carbohydrate: { kcal: kcal.carbohydrate, percent: (kcal.carbohydrate / total) * 100 },
  };
}

/**
 * EU Nutrient Reference Values for adults (Regulation (EU) No 1169/2011, Annex XIII).
 * Used only as a common yardstick so different nutrients can share one chart.
 * Indian (FSSAI/ICMR) reference intakes differ somewhat - shown as a labelling reference, not advice.
 */
export const NRV_EU: Record<string, { amount: number; unit: string }> = {
  magnesium: { amount: 375, unit: "mg" },
  phosphorus: { amount: 700, unit: "mg" },
  copper: { amount: 1, unit: "mg" },
  manganese: { amount: 2, unit: "mg" },
  zinc: { amount: 10, unit: "mg" },
  iron: { amount: 14, unit: "mg" },
  potassium: { amount: 2000, unit: "mg" },
  vitamin_k: { amount: 75, unit: "mcg" },
  vitamin_b6: { amount: 1.4, unit: "mg" },
  thiamin: { amount: 1.1, unit: "mg" },
};

/** Percent of the reference value, or null when we have no reference for that nutrient / unit differs. */
export function percentNRV(key: string, amount: number, unit: string): number | null {
  const ref = NRV_EU[key];
  if (!ref || ref.unit !== unit) return null;
  return (amount / ref.amount) * 100;
}
