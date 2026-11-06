import { describe, expect, it } from "vitest";
import { paiseToRupeesString, rupeesToPaise, slugify } from "@/lib/admin/text";

describe("slugify", () => {
  it.each([
    ["Raw Whole Cashews W180", "raw-whole-cashews-w180"],
    ["  Roasted & Salted  ", "roasted-and-salted"],
    ["Café Délice!!", "cafe-delice"],
    ["---weird___name---", "weird-name"],
    ["", ""],
  ])("%j -> %j", (i, o) => expect(slugify(i)).toBe(o));
  it("caps the length", () => expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80));
});

describe("rupeesToPaise", () => {
  it.each([["499", 49900], ["499.5", 49950], ["1,299.00", 129900], ["₹ 20", 2000], [75, 7500], ["0.99", 99]])("%j -> %s", (i, o) => {
    expect(rupeesToPaise(i)).toBe(o);
  });
  it.each(["", "abc", "-5", "1.234", "1e3", "12.", ".5"])("rejects %j", (i) => expect(rupeesToPaise(i)).toBeNull());
  it("avoids float drift (19.99 * 100 = 1998.9999...)", () => expect(rupeesToPaise("19.99")).toBe(1999));
});

describe("paiseToRupeesString", () => {
  it("round-trips", () => {
    for (const p of [0, 99, 1999, 49900, 129950]) expect(rupeesToPaise(paiseToRupeesString(p))).toBe(p);
  });
});
