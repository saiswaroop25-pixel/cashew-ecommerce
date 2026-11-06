import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth/safe-next";

describe("safeNext (open-redirect guard)", () => {
  it("allows same-site paths, including query strings", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("/shop?grade=W240")).toBe("/shop?grade=W240");
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com", // backslash: some browsers treat it like a slash
    "javascript:alert(1)",
    "evil.com",
    "",
  ])("rejects %j", (bad) => {
    expect(safeNext(bad)).toBe("/account");
  });
  it("rejects non-strings and honours a custom fallback", () => {
    expect(safeNext(undefined, "/")).toBe("/");
    expect(safeNext(["/a"], "/")).toBe("/");
  });
});
