import { describe, expect, it } from "vitest";
import {
  addressSchema,
  echoValues,
  loginSchema,
  profileSchema,
  registerSchema,
  resetSchema,
} from "@/lib/validators/auth";

const base = { fullName: "Asha Rao", email: " Asha@Example.COM ", password: "cashew123", confirmPassword: "cashew123", terms: "on" };

describe("registerSchema", () => {
  it("accepts valid input and normalises the email", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success && r.data.email).toBe("asha@example.com");
  });
  it.each([
    ["short", "abc1"],
    ["no number", "cashewcashew"],
    ["no letter", "12345678"],
  ])("rejects a weak password (%s)", (_n, password) => {
    expect(registerSchema.safeParse({ ...base, password, confirmPassword: password }).success).toBe(false);
  });
  it("rejects mismatched confirmation", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "different1" });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path[0]).toBe("confirmPassword");
  });
});

describe("registerSchema consent", () => {
  it("requires the terms box to be ticked", () => {
    const { terms: _t, ...without } = base;
    const r = registerSchema.safeParse(without);
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path[0]).toBe("terms");
  });
});

describe("loginSchema / resetSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("applies the same strength rules on reset", () => {
    expect(resetSchema.safeParse({ password: "weak", confirmPassword: "weak" }).success).toBe(false);
    expect(resetSchema.safeParse({ password: "strong123", confirmPassword: "strong123" }).success).toBe(true);
  });
});

describe("profileSchema phone", () => {
  it("allows empty (becomes null)", () => {
    const r = profileSchema.parse({ fullName: "Asha Rao", phone: "" });
    expect(r.phone).toBeNull();
  });
  it.each(["+91 98765-43210", "09876543210", "9876543210"])("normalises %s", (phone) => {
    expect(profileSchema.parse({ fullName: "Asha Rao", phone }).phone).toBe("9876543210");
  });
  it("rejects numbers that do not look Indian-mobile", () => {
    expect(profileSchema.safeParse({ fullName: "Asha Rao", phone: "1234567890" }).success).toBe(false);
  });
});

describe("addressSchema", () => {
  const ok = {
    fullName: "Asha Rao", phone: "9876543210", line1: "12 MG Road", city: "Mangaluru",
    state: "Karnataka", postalCode: "575001",
  };
  it("accepts a valid address; checkbox 'on' -> true", () => {
    const r = addressSchema.parse({ ...ok, isDefault: "on" });
    expect(r.isDefault).toBe(true);
    expect(addressSchema.parse(ok).isDefault).toBe(false);
  });
  it.each(["57500", "075001", "abcdef"])("rejects PIN %s", (postalCode) => {
    expect(addressSchema.safeParse({ ...ok, postalCode }).success).toBe(false);
  });
});

describe("echoValues", () => {
  it("never echoes passwords back to the browser", () => {
    const fd = new FormData();
    fd.set("email", "a@b.co");
    fd.set("password", "secret123");
    fd.set("confirmPassword", "secret123");
    expect(echoValues(fd)).toEqual({ email: "a@b.co" });
  });
});
