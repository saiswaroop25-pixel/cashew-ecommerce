import { describe, expect, it } from "vitest";
import { createCashewGeometry } from "@/lib/three/cashew-geometry";

describe("createCashewGeometry", () => {
  const geo = createCashewGeometry({ radial: 16, tubular: 40 });
  const pos = geo.getAttribute("position");

  it("has the expected vertex and index counts", () => {
    expect(pos.count).toBe((16 + 1) * (40 + 1));
    expect(geo.getIndex()!.count).toBe(16 * 40 * 6);
  });

  it("contains no NaN/Infinity (a bad sweep would silently make an invisible mesh)", () => {
    for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
    const normals = geo.getAttribute("normal");
    for (let i = 0; i < normals.array.length; i++) expect(Number.isFinite(normals.array[i])).toBe(true);
  });

  it("is centred on the origin and has a sensible, kidney-like size", () => {
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const size = box.getSize(new (box.min.constructor as new () => typeof box.min)());
    expect(Math.abs(box.min.x + box.max.x)).toBeLessThan(0.05);
    expect(Math.abs(box.min.y + box.max.y)).toBeLessThan(0.05);
    expect(size.x).toBeGreaterThan(1); // long axis
    expect(size.y).toBeGreaterThan(0.4);
    expect(size.z).toBeLessThan(size.y); // flatter than it is wide
  });

  it("scales with the size option", () => {
    const big = createCashewGeometry({ radial: 16, tubular: 40, size: 2 });
    big.computeBoundingBox();
    geo.computeBoundingBox();
    expect(big.boundingBox!.max.x).toBeCloseTo(geo.boundingBox!.max.x * 2, 4);
  });

  it("uses indices that all reference real vertices", () => {
    const idx = geo.getIndex()!;
    for (let i = 0; i < idx.count; i++) expect(idx.getX(i)).toBeLessThan(pos.count);
  });
});
