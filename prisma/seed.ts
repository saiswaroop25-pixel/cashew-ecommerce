/**
 * DEMO seed. Everything created here is flagged isDemo = true and must be
 * replaced by real business data via the admin dashboard before launch.
 * Prices, stock and product names are illustrative placeholders only.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type CashewForm, type CashewGrade } from "../generated/prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const categories = [
  { name: "Whole Cashews", slug: "whole-cashews" },
  { name: "Roasted & Salted", slug: "roasted-salted" },
  { name: "Broken Cashews", slug: "broken-cashews" },
];

type P = {
  slug: string;
  name: string;
  cat: string;
  form: CashewForm;
  grade: CashewGrade;
  featured?: boolean;
  popularity: number;
  raw?: boolean;
  pricePer250: number; // paise
};
const products: P[] = [
  { slug: "demo-raw-whole-w180", name: "Raw Whole Cashews W180 (Demo)", cat: "whole-cashews", form: "RAW", grade: "W180", featured: true, popularity: 90, raw: true, pricePer250: 32500 },
  { slug: "demo-raw-whole-w240", name: "Raw Whole Cashews W240 (Demo)", cat: "whole-cashews", form: "RAW", grade: "W240", featured: true, popularity: 80, raw: true, pricePer250: 29500 },
  { slug: "demo-raw-whole-w320", name: "Raw Whole Cashews W320 (Demo)", cat: "whole-cashews", form: "RAW", grade: "W320", popularity: 60, raw: true, pricePer250: 26500 },
  { slug: "demo-roasted-w240", name: "Roasted Cashews W240 (Demo)", cat: "roasted-salted", form: "ROASTED", grade: "W240", featured: true, popularity: 70, pricePer250: 31000 },
  { slug: "demo-salted-w320", name: "Salted Cashews W320 (Demo)", cat: "roasted-salted", form: "SALTED", grade: "W320", popularity: 50, pricePer250: 28000 },
  { slug: "demo-broken-bb", name: "Broken Cashews (Demo)", cat: "broken-cashews", form: "BROKEN", grade: "BROKEN_BB", popularity: 30, pricePer250: 18000 },
];
const packs = [
  { label: "250 g", grams: 250, mult: 1 },
  { label: "500 g", grams: 500, mult: 1.9 },
  { label: "1 kg", grams: 1000, mult: 3.6 },
];

// Reference values per 100 g, raw cashew nuts - USDA FoodData Central (SR Legacy).
// Verify against the source (or replace with lab results) before publishing.
const nutrients: [string, string, "MACRO" | "MINERAL" | "VITAMIN", number, string][] = [
  ["energy", "Energy", "MACRO", 553, "kcal"],
  ["protein", "Protein", "MACRO", 18.22, "g"],
  ["fat", "Total fat", "MACRO", 43.85, "g"],
  ["carbohydrate", "Carbohydrates", "MACRO", 30.19, "g"],
  ["fibre", "Dietary fibre", "MACRO", 3.3, "g"],
  ["sugar", "Sugars", "MACRO", 5.91, "g"],
  ["magnesium", "Magnesium", "MINERAL", 292, "mg"],
  ["phosphorus", "Phosphorus", "MINERAL", 593, "mg"],
  ["copper", "Copper", "MINERAL", 2.195, "mg"],
  ["manganese", "Manganese", "MINERAL", 1.655, "mg"],
  ["zinc", "Zinc", "MINERAL", 5.78, "mg"],
  ["iron", "Iron", "MINERAL", 6.68, "mg"],
  ["potassium", "Potassium", "MINERAL", 660, "mg"],
  ["vitamin_k", "Vitamin K", "VITAMIN", 34.1, "mcg"],
  ["vitamin_b6", "Vitamin B6", "VITAMIN", 0.417, "mg"],
  ["thiamin", "Thiamin (B1)", "VITAMIN", 0.423, "mg"],
];

const stages: [string, string, string][] = [
  ["Cashew fruit on the tree", "Cashew nuts grow attached to the bottom of the cashew apple.", "Healthy, ripe fruit is the starting point for kernel quality."],
  ["Harvesting", "Ripe fruits are collected once they fall or are picked.", "Harvesting at the right ripeness affects kernel size and flavour."],
  ["Separating apple and nut", "The raw nut is twisted off the cashew apple.", "Prompt separation limits spoilage of the nut."],
  ["Collecting raw nuts", "Raw cashew nuts are gathered and bagged.", "Clean, careful collection reduces contamination."],
  ["Cleaning and drying", "Nuts are cleaned of debris and sun-dried.", "Correct moisture levels help prevent mould during storage."],
  ["Steaming / heat treatment", "Heat loosens the shell so the kernel can be freed.", "Controlled treatment protects the kernel from damage."],
  ["Shelling", "Shells are cut open and the kernel is removed.", "Careful cutting keeps kernels whole."],
  ["Kernel separation", "Kernels are separated from shell pieces.", "Prevents shell fragments in the final product."],
  ["Peeling", "The thin brown skin (testa) is removed.", "Gives the clean, pale appearance buyers expect."],
  ["Grading and sorting", "Kernels are sorted by size and colour into grades such as W180 and W240.", "Consistent grading means consistent product."],
  ["Quality inspection", "Kernels are checked for defects before packing.", "Catches defects before they reach customers."],
  ["Packaging", "Kernels are packed in sealed packs.", "Good packaging protects freshness."],
  ["Storage and dispatch", "Packed goods are stored and dispatched.", "Proper storage preserves quality until delivery."],
];

async function main() {
  const cat: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    cat[c.slug] = (
      await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c, sortOrder: i } })
    ).id;
  }

  const profile = await prisma.nutritionProfile.upsert({
    where: { slug: "raw-cashew-usda-reference" },
    update: {},
    create: {
      name: "Raw cashew kernels (reference)",
      slug: "raw-cashew-usda-reference",
      sourceType: "REFERENCE",
      sourceNote:
        "USDA FoodData Central, SR Legacy - cashew nuts, raw. Generic reference, NOT lab-tested values for our product. Demo data: verify before publishing.",
      isDemo: true,
      values: {
        create: nutrients.map(([key, label, category, amount, unit], i) => ({ key, label, category, amount, unit, sortOrder: i })),
      },
    },
  });

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        categoryId: cat[p.cat],
        form: p.form,
        grade: p.grade,
        shortDescription: "Demonstration product - replace with real details.",
        description:
          "DEMO CONTENT. This product exists only to demonstrate the store. Replace the description, pricing and stock with real information in the admin dashboard.",
        storageInstruction: "Store in a cool, dry place in an airtight container. (Demo text)",
        deliveryInfo: "Delivery details to be confirmed. (Demo text)",
        isFeatured: !!p.featured,
        popularity: p.popularity,
        isDemo: true,
        nutritionProfileId: p.raw ? profile.id : null,
      },
    });
    for (const pk of packs) {
      const sku = `${p.slug}-${pk.grams}`.toUpperCase();
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          label: pk.label,
          weightGrams: pk.grams,
          priceInPaise: Math.round(p.pricePer250 * pk.mult),
        },
      });
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: { variantId: variant.id, quantity: 50 },
      });
    }
  }

  for (const [i, [title, summary, qualityNote]] of stages.entries()) {
    await prisma.manufacturingStage.upsert({
      where: { step: i + 1 },
      update: {},
      create: { step: i + 1, title, summary, qualityNote, isDemo: true },
    });
  }
  console.log("Seed complete (demo data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
