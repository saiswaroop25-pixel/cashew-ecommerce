import { describe, expect, it } from "vitest";
import { cn, formatINR } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatINR", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(49900)).toBe("₹499");
  });
  it("keeps paise when present", () => {
    expect(formatINR(49950)).toBe("₹499.50");
  });
});
