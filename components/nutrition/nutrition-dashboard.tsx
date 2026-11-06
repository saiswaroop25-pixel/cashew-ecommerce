"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MAX_SERVING_G,
  MIN_SERVING_G,
  SERVING_PRESETS,
  clampServing,
  energyShares,
  formatAmount,
  percentNRV,
  scaleToServing,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { NutritionProfileView } from "@/services/nutrition";

const SOURCE_LABEL: Record<NutritionProfileView["sourceType"], string> = {
  LAB_TESTED: "Laboratory tested",
  SUPPLIER: "Supplier information",
  REFERENCE: "Authoritative reference – not tested on our own product",
};

// Brand palette
const MACRO_COLORS = { Protein: "#344B35", Fat: "#C5A46D", Carbohydrate: "#795438" } as const;
const SERIES_COLORS = ["#344B35", "#C5A46D", "#795438", "#38271F"];

type Preset = (typeof SERVING_PRESETS)[number] | "custom";

export function NutritionDashboard({ profiles }: { profiles: NutritionProfileView[] }) {
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [preset, setPreset] = useState<Preset>(30);
  const [custom, setCustom] = useState("40");

  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];
  if (!profile) {
    return <p className="rounded-card bg-white p-8 text-brown shadow-soft">Nutrition data will appear here once it has been added.</p>;
  }

  const servingGrams = preset === "custom" ? clampServing(Number(custom)) : preset;
  const scaled = scaleToServing(profile.values, profile.basisGrams, servingGrams);
  const macros = scaled.filter((v) => v.category === "MACRO");
  const shares = energyShares(scaled);

  const donut = shares
    ? [
        { name: "Protein", percent: shares.protein.percent, kcal: shares.protein.kcal },
        { name: "Fat", percent: shares.fat.percent, kcal: shares.fat.kcal },
        { name: "Carbohydrate", percent: shares.carbohydrate.percent, kcal: shares.carbohydrate.kcal },
      ]
    : [];

  const nrvData = scaled
    .filter((v) => v.category !== "MACRO")
    .map((v) => ({ name: v.label, pct: percentNRV(v.key, v.amount, v.unit), amount: v.amount, unit: v.unit }))
    .filter((d): d is { name: string; pct: number; amount: number; unit: string } => d.pct !== null)
    .sort((a, b) => b.pct - a.pct);

  const compareKeys = ["protein", "fat", "carbohydrate", "fibre", "sugar"];
  const compareData = compareKeys
    .map((key) => {
      const row: Record<string, string | number> = { name: profiles[0].values.find((v) => v.key === key)?.label ?? key };
      let any = false;
      for (const p of profiles) {
        const v = p.values.find((x) => x.key === key);
        if (v) {
          row[p.name] = Number(((v.amount * servingGrams) / p.basisGrams).toFixed(2));
          any = true;
        }
      }
      return any ? row : null;
    })
    .filter((r): r is Record<string, string | number> => r !== null);

  return (
    <div className="space-y-10">
      {/* ───────── Controls ───────── */}
      <div className="grid gap-6 rounded-card bg-white p-6 shadow-soft md:grid-cols-2">
        {profiles.length > 1 && (
          <div className="md:col-span-2">
            <label htmlFor="profile" className="mb-1 block text-sm text-brown">Product</label>
            <select id="profile" value={profile.id} onChange={(e) => setProfileId(e.target.value)} className="w-full rounded-lg border border-cashew bg-white px-3 py-2.5 text-sm text-chocolate">
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm text-brown">Serving size</legend>
          <div className="flex flex-wrap gap-2">
            {([...SERVING_PRESETS, "custom"] as Preset[]).map((p) => (
              <label key={p} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm", preset === p ? "border-forest bg-forest text-cream" : "border-cashew text-chocolate hover:border-forest")}>
                <input type="radio" name="serving" value={p} checked={preset === p} onChange={() => setPreset(p)} className="sr-only" />
                {p === "custom" ? "Custom" : `${p} g`}
              </label>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3">
              <label htmlFor="custom-g" className="mb-1 block text-sm text-brown">Grams ({MIN_SERVING_G}–{MAX_SERVING_G})</label>
              <input id="custom-g" type="number" inputMode="numeric" min={MIN_SERVING_G} max={MAX_SERVING_G} value={custom}
                onChange={(e) => setCustom(e.target.value)} onBlur={() => setCustom(String(clampServing(Number(custom))))}
                className="w-32 rounded-lg border border-cashew bg-white px-3 py-2 text-sm text-chocolate" />
            </div>
          )}
        </fieldset>

        <div aria-live="polite" className="text-sm text-brown">
          <p>Showing values for <strong className="text-chocolate">{servingGrams} g</strong> of <strong className="text-chocolate">{profile.name}</strong>.</p>
          <p className="mt-2">
            <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs text-chocolate">{SOURCE_LABEL[profile.sourceType]}</span>
            {profile.isDemo && <span className="ml-2 rounded-full bg-chocolate/80 px-2.5 py-1 text-xs text-cream">Demo data</span>}
          </p>
          <p className="mt-2 text-xs">{profile.sourceNote}</p>
        </div>
      </div>

      {/* ───────── Macronutrient cards ───────── */}
      <section aria-labelledby="macros-h">
        <h2 id="macros-h" className="font-serif text-3xl text-forest">Per {servingGrams} g serving</h2>
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {macros.map((m) => (
            <li key={m.key} className="rounded-card bg-forest p-5 text-cream">
              <p className="font-serif text-3xl">{formatAmount(m.amount)}<span className="ml-1 text-base text-cream/70">{m.unit}</span></p>
              <p className="mt-1 text-sm text-cream/80">{m.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ───────── Macro distribution ───────── */}
        <section aria-labelledby="dist-h" className="rounded-card bg-white p-6 shadow-soft">
          <h2 id="dist-h" className="font-serif text-2xl text-forest">Macronutrient distribution</h2>
          <p className="mt-1 text-xs text-brown">Approximate share of energy from protein, fat and carbohydrate (general 4/9/4 kcal-per-gram factors).</p>
          {shares ? (
            <>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 360, height: 256 }}>
                  <PieChart>
                    <Pie data={donut} dataKey="percent" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                      {donut.map((d) => <Cell key={d.name} fill={MACRO_COLORS[d.name as keyof typeof MACRO_COLORS]} />)}
                    </Pie>
                    <Tooltip formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% (~${Math.round((item.payload as { kcal: number }).kcal)} kcal)`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="sr-only">
                Energy share: {donut.map((d) => `${d.name} ${d.percent.toFixed(0)} percent`).join(", ")}.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-brown">Macronutrient values are not available for this product.</p>
          )}
        </section>

        {/* ───────── Micronutrients ───────── */}
        <section aria-labelledby="micro-h" className="rounded-card bg-white p-6 shadow-soft">
          <h2 id="micro-h" className="font-serif text-2xl text-forest">Micronutrients</h2>
          <p className="mt-1 text-xs text-brown">Per serving as a % of the EU adult Nutrient Reference Value (a labelling yardstick; the dashed line is 100%).</p>
          {nrvData.length > 0 ? (
            <div className="mt-2" style={{ height: nrvData.length * 34 + 50 }}>
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 360, height: 300 }}>
                <BarChart data={nrvData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, (max: number) => Math.max(100, Math.ceil(max / 25) * 25)]} unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, _n, item) => [`${Number(v).toFixed(0)}% (${formatAmount((item.payload as { amount: number }).amount)} ${(item.payload as { unit: string }).unit})`, "of NRV"]} />
                  <ReferenceLine x={100} stroke="#38271F" strokeDasharray="4 4" />
                  <Bar dataKey="pct" fill="#344B35" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-brown">Micronutrient values are not available for this product.</p>
          )}
        </section>
      </div>

      {/* ───────── Comparison ───────── */}
      <section aria-labelledby="compare-h" className="rounded-card bg-white p-6 shadow-soft">
        <h2 id="compare-h" className="font-serif text-2xl text-forest">Compare varieties</h2>
        {profiles.length > 1 ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
              <BarChart data={compareData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis unit=" g" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {profiles.map((p, i) => <Bar key={p.id} dataKey={p.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-sm text-brown">
            A side-by-side comparison of raw, roasted, salted and unsalted cashews will appear here once nutrition data with a stated
            source (laboratory report or supplier information) has been added for each of them. We only compare values we can back up.
          </p>
        )}
      </section>

      {/* ───────── Full table (also the accessible alternative to the charts) ───────── */}
      <section aria-labelledby="table-h">
        <h2 id="table-h" className="font-serif text-2xl text-forest">Full nutrition table</h2>
        <div className="mt-4 overflow-x-auto rounded-card bg-white shadow-soft">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Nutrition per {servingGrams} grams of {profile.name}</caption>
            <thead className="bg-cashew/40 text-left text-xs uppercase tracking-widest text-brown">
              <tr>
                <th scope="col" className="px-4 py-3">Nutrient</th>
                <th scope="col" className="px-4 py-3 text-right">Per {servingGrams} g</th>
                <th scope="col" className="px-4 py-3 text-right">% EU NRV</th>
              </tr>
            </thead>
            <tbody>
              {scaled.map((v) => {
                const pct = percentNRV(v.key, v.amount, v.unit);
                return (
                  <tr key={v.key} className="border-t border-cashew">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal text-chocolate">{v.label}</th>
                    <td className="px-4 py-2.5 text-right text-brown">{formatAmount(v.amount)} {v.unit}</td>
                    <td className="px-4 py-2.5 text-right text-brown">{pct === null ? "–" : `${pct.toFixed(0)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
