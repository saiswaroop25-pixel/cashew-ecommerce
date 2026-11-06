import { describe, expect, it } from "vitest";
import { decide3D, mulberry32, type CapabilitySignals } from "@/lib/three/capability";

const good: CapabilitySignals = { reducedMotion: false, saveData: false, effectiveType: "4g", hardwareConcurrency: 8, deviceMemory: 8, webgl: true };

describe("decide3D", () => {
  it("allows 3D on a capable device", () => {
    expect(decide3D(good)).toEqual({ use3D: true });
  });
  it("allows 3D when optional signals are unknown (Safari/Firefox expose few)", () => {
    expect(decide3D({ reducedMotion: false, saveData: false, webgl: true })).toEqual({ use3D: true });
  });
  it("respects reduced motion above everything else", () => {
    expect(decide3D({ ...good, reducedMotion: true })).toEqual({ use3D: false, reason: "reduced-motion" });
  });
  it("respects Save-Data", () => {
    expect(decide3D({ ...good, saveData: true })).toEqual({ use3D: false, reason: "save-data" });
  });
  it.each(["slow-2g", "2g", "3g"])("skips 3D on a %s connection", (effectiveType) => {
    expect(decide3D({ ...good, effectiveType })).toEqual({ use3D: false, reason: "slow-network" });
  });
  it("skips 3D on weak hardware", () => {
    expect(decide3D({ ...good, hardwareConcurrency: 2 })).toEqual({ use3D: false, reason: "weak-device" });
    expect(decide3D({ ...good, deviceMemory: 2 })).toEqual({ use3D: false, reason: "weak-device" });
  });
  it("skips 3D without WebGL", () => {
    expect(decide3D({ ...good, webgl: false })).toEqual({ use3D: false, reason: "no-webgl" });
  });
});

describe("decide3D forced (?3d=on QA override)", () => {
  it("overrides the weak-device and slow-network heuristics", () => {
    expect(decide3D({ ...good, hardwareConcurrency: 1, deviceMemory: 1, forced: true })).toEqual({ use3D: true });
    expect(decide3D({ ...good, effectiveType: "2g", forced: true })).toEqual({ use3D: true });
  });
  it("never overrides reduced motion, data saver or missing WebGL", () => {
    expect(decide3D({ ...good, reducedMotion: true, forced: true })).toEqual({ use3D: false, reason: "reduced-motion" });
    expect(decide3D({ ...good, saveData: true, forced: true })).toEqual({ use3D: false, reason: "save-data" });
    expect(decide3D({ ...good, webgl: false, forced: true })).toEqual({ use3D: false, reason: "no-webgl" });
  });
});

describe("mulberry32", () => {
  it("is deterministic and within [0, 1)", () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it("gives different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});
