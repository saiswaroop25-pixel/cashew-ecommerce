import { describe, expect, it } from "vitest";
import { isUnknownLegalPath } from "@/lib/legal";

describe("isUnknownLegalPath", () => {
  it.each(["/legal/privacy-policy", "/legal/terms", "/legal/shipping-policy/", "/legal/returns-policy"])("%s is a real policy page", (p) => {
    expect(isUnknownLegalPath(p)).toBe(false);
  });
  it.each(["/legal/nope", "/legal/", "/legal/privacy-policy/extra", "/legal/..%2f", "/legal/PRIVACY-POLICY"])("%s is unknown (gets a real 404)", (p) => {
    expect(isUnknownLegalPath(p)).toBe(true);
  });
  it("ignores every other path", () => {
    for (const p of ["/", "/shop", "/legalese", "/products/legal"]) expect(isUnknownLegalPath(p)).toBe(false);
  });
});
