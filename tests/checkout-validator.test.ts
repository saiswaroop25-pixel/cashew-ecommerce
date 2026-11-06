import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/validators/checkout";

const ok = {
  fullName: "Asha Rao", email: " Asha@Example.com ", phone: "+91 98765 43210", line1: "12 MG Road",
  city: "Mangaluru", state: "Karnataka", postalCode: "575001",
};

describe("checkoutSchema", () => {
  it("accepts a valid guest checkout and normalises email/phone", () => {
    const r = checkoutSchema.parse(ok);
    expect(r.email).toBe("asha@example.com");
    expect(r.phone).toBe("9876543210");
    expect(r.line2).toBeNull();
    expect(r.notes).toBeNull();
  });
  it("rejects a state that is not in the list (no free-text injection)", () => {
    expect(checkoutSchema.safeParse({ ...ok, state: "Atlantis" }).success).toBe(false);
  });
  it.each(["12345", "012345", "57500a"])("rejects PIN %s", (postalCode) => {
    expect(checkoutSchema.safeParse({ ...ok, postalCode }).success).toBe(false);
  });
  it("caps order notes at 300 characters", () => {
    expect(checkoutSchema.safeParse({ ...ok, notes: "x".repeat(301) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, notes: "x".repeat(300) }).success).toBe(true);
  });
  it("requires the essentials", () => {
    const r = checkoutSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});
