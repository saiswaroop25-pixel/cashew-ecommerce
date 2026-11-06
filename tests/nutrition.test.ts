import { describe, expect, it } from "vitest";
import { clampServing, energyShares, formatAmount, percentNRV, scaleToServing } from "@/lib/nutrition";

const per100 = [
  { key: "protein", label: "Protein", category: "MACRO" as const, amount: 18.22, unit: "g" },
  { key: "fat", label: "Fat", category: "MACRO" as const, amount: 43.85, unit: "g" },
  { key: "carbohydrate", label: "Carbs", category: "MACRO" as const, amount: 30.19, unit: "g" },
  { key: "copper", label: "Copper", category: "MINERAL" as const, amount: 2.195, unit: "mg" },
];

describe("scaleToServing", () => {
  it("scales linearly from the basis", () => {
    const s = scaleToServing(per100, 100, 30);
    expect(s[0].amount).toBeCloseTo(5.466, 3);
    expect(s[3].amount).toBeCloseTo(0.6585, 4);
  });
  it("returns the same amounts at the basis size and does not mutate input", () => {
    const s = scaleToServing(per100, 100, 100);
    expect(s.map((v) => v.amount)).toEqual(per100.map((v) => v.amount));
    scaleToServing(per100, 100, 50);
    expect(per100[0].amount).toBe(18.22);
  });
  it("works for a basis other than 100 g", () => {
    expect(scaleToServing([{ amount: 10 }], 50, 25)[0].amount).toBe(5);
  });
});

describe("clampServing", () => {
  it.each([[0, 1], [-5, 1], [30.4, 30], [9999, 500], [NaN, 30], [Infinity, 30]])("%s -> %s", (i, o) => {
    expect(clampServing(i)).toBe(o);
  });
});

describe("formatAmount", () => {
  it.each([[553, "553"], [43.85, "43.9"], [5.466, "5.47"], [0.6586, "0.659"], [2, "2"], [0.1, "0.1"]])("%s -> %s", (n, s) => {
    expect(formatAmount(n)).toBe(s);
  });
});

describe("energyShares", () => {
  it("uses Atwater factors and sums to 100%", () => {
    const e = energyShares(per100)!;
    expect(e.protein.kcal).toBeCloseTo(72.88, 2);
    expect(e.fat.kcal).toBeCloseTo(394.65, 2);
    expect(e.protein.percent + e.fat.percent + e.carbohydrate.percent).toBeCloseTo(100, 6);
    expect(e.fat.percent).toBeGreaterThan(e.protein.percent);
  });
  it("returns null with no macro data (never divides by zero)", () => {
    expect(energyShares([])).toBeNull();
  });
});

describe("percentNRV", () => {
  it("computes percent of the EU reference value", () => {
    expect(percentNRV("magnesium", 187.5, "mg")).toBeCloseTo(50, 6);
    expect(percentNRV("copper", 2.195, "mg")).toBeCloseTo(219.5, 6);
  });
  it("returns null for unknown nutrients or mismatched units (no guessing)", () => {
    expect(percentNRV("energy", 553, "kcal")).toBeNull();
    expect(percentNRV("vitamin_k", 34.1, "mg")).toBeNull();
  });
});
