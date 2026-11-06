import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";
import { BENEFIT_TOPICS, NUTRITION_DISCLAIMER } from "@/lib/nutrition-content";
import { formatAmount } from "@/lib/nutrition";
import { listNutritionProfiles } from "@/services/nutrition";

export const metadata: Metadata = {
  title: "Cashew nutrition & health benefits",
  description:
    "Explore the nutritional profile of cashews with interactive charts and a serving-size calculator. Educational information only.",
  alternates: { canonical: "/nutrition" },
};

export default function NutritionPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Good to know</p>
      <h1 className="mt-2 font-serif text-4xl text-forest md:text-5xl">Cashew nutrition</h1>
      <p className="mt-4 max-w-2xl text-lg text-brown">
        See what is in cashews, adjust the serving size, and explore the numbers. Every value shows where it comes from.
      </p>

      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-card bg-cashew/40" aria-hidden />}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const profiles = await listNutritionProfiles();
  // Benefit chips use the first profile's real values (per its basis), never numbers typed into copy.
  const ref = profiles[0];

  return (
    <>
      <section className="mt-12" aria-labelledby="benefits-h">
        <h2 id="benefits-h" className="font-serif text-3xl text-forest">What cashews offer</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BENEFIT_TOPICS.map((t) => {
            const chips = ref
              ? t.nutrientKeys.map((k) => ref.values.find((v) => v.key === k)).filter((v) => !!v)
              : [];
            return (
              <li key={t.id} className="flex flex-col rounded-card border border-cashew bg-white p-6">
                <h3 className="font-serif text-xl text-chocolate">{t.title}</h3>
                <p className="mt-2 text-sm text-brown">{t.text}</p>
                {chips.length > 0 && ref && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Amounts per ${ref.basisGrams} g`}>
                    {chips.map((c) => (
                      <li key={c.key} className="rounded-full bg-cashew/50 px-3 py-1 text-xs text-chocolate">
                        {c.label}: {formatAmount(c.amount)} {c.unit}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {ref && <p className="mt-3 text-xs text-brown">Amounts shown are per {ref.basisGrams} g ({ref.name}).</p>}
      </section>

      <section className="mt-14" aria-labelledby="dash-h">
        <h2 id="dash-h" className="font-serif text-3xl text-forest">Interactive nutrition dashboard</h2>
        <div className="mt-6">
          <NutritionDashboard profiles={profiles} />
        </div>
        {profiles.some((p) => p.products.length > 0) && (
          <p className="mt-6 text-sm text-brown">
            Ready to try them?{" "}
            <Link href="/shop" className="text-forest underline">Browse our cashews</Link>.
          </p>
        )}
      </section>

      <p role="note" className="mt-12 rounded-card bg-gold/20 p-5 text-sm text-chocolate">
        <strong>Please note:</strong> {NUTRITION_DISCLAIMER}
      </p>
    </>
  );
}
