/**
 * Educational copy for the nutrition page.
 *
 * Wording rules: describe what nutrients contribute to in general terms ("contributes to normal ...")
 * and never claim that cashews cure, prevent or treat a condition. Each topic lists the nutrient
 * keys whose real values (from the stored profile) are shown beside it, so numbers are never typed here.
 */
export type BenefitTopic = {
  id: string;
  title: string;
  text: string;
  nutrientKeys: string[];
};

export const BENEFIT_TOPICS: BenefitTopic[] = [
  {
    id: "heart",
    title: "Heart health",
    text: "Most of the fat in cashews is unsaturated fat. Choosing unsaturated fats in place of some saturated fats is one part of a balanced eating pattern that supports a healthy heart.",
    nutrientKeys: ["fat"],
  },
  {
    id: "protein",
    title: "Plant-based protein",
    text: "Cashews contain protein, so they can be one of the plant foods that contribute to your daily protein intake alongside pulses, grains and dairy.",
    nutrientKeys: ["protein"],
  },
  {
    id: "bone",
    title: "Bone health",
    text: "Magnesium and phosphorus contribute to the maintenance of normal bones. Cashews contain both, as part of a varied diet.",
    nutrientKeys: ["magnesium", "phosphorus"],
  },
  {
    id: "energy",
    title: "Energy and metabolism",
    text: "Fat, protein and carbohydrate supply energy. Magnesium, copper and thiamin also contribute to normal energy-yielding metabolism.",
    nutrientKeys: ["energy", "magnesium", "copper", "thiamin"],
  },
  {
    id: "antioxidant",
    title: "Antioxidant nutrients",
    text: "Copper, manganese and zinc contribute to the protection of cells from oxidative stress. Cashews contain all three.",
    nutrientKeys: ["copper", "manganese", "zinc"],
  },
  {
    id: "nervous",
    title: "Nervous system",
    text: "Magnesium, vitamin B6, thiamin and copper contribute to the normal functioning of the nervous system.",
    nutrientKeys: ["magnesium", "vitamin_b6", "thiamin", "copper"],
  },
];

export const NUTRITION_DISCLAIMER =
  "This page is for general education only and is not medical or dietary advice. Cashews do not cure, prevent or treat any disease. " +
  "Nutrient amounts depend on the stated source and vary between products and batches. " +
  "Cashews are tree nuts and a common allergen - people with a nut allergy must avoid them. " +
  "If you have a medical condition or special dietary needs, please speak to a doctor or registered dietitian.";
