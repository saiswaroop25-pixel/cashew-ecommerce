import { describe, expect, it } from "vitest";
import { POLICIES, clientIp, humanWait, secondsLeftInWindow, windowStartFor } from "@/lib/security/rate-limit";

describe("windows", () => {
  it("aligns to fixed boundaries", () => {
    expect(windowStartFor(new Date("2026-06-15T10:07:30Z"), 600).toISOString()).toBe("2026-06-15T10:00:00.000Z");
    expect(windowStartFor(new Date("2026-06-15T10:10:00Z"), 600).toISOString()).toBe("2026-06-15T10:10:00.000Z");
  });
  it("counts seconds left, never below 1", () => {
    expect(secondsLeftInWindow(new Date("2026-06-15T10:07:30Z"), 600)).toBe(150);
    expect(secondsLeftInWindow(new Date("2026-06-15T10:09:59.999Z"), 600)).toBe(1);
  });
});

describe("clientIp", () => {
  const from = (h: Record<string, string>) => clientIp((n) => h[n]);
  it("uses the first x-forwarded-for entry (the real client behind proxies)", () => {
    expect(from({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" })).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip, then to a shared 'unknown' bucket", () => {
    expect(from({ "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(from({})).toBe("unknown");
  });
  it("accepts IPv6 but rejects junk and header-injection attempts (never trust header text blindly)", () => {
    expect(from({ "x-forwarded-for": "2001:db8::1" })).toBe("2001:db8::1");
    for (const bad of ["<script>", "1.2.3.4; DROP TABLE", "a".repeat(100), "../../etc", ""]) expect(from({ "x-forwarded-for": bad })).toBe("unknown");
  });
});

describe("humanWait", () => {
  it.each([[30, "a minute"], [89, "a minute"], [300, "about 5 minutes"], [3600, "about 60 minutes"], [7200, "about 2 hours"]])("%ss -> %s", (s, t) => {
    expect(humanWait(s)).toBe(t);
  });
});

describe("policies", () => {
  it("every sensitive flow has a rule, and account-targeted flows limit per identity too", () => {
    for (const name of ["login", "signup", "passwordReset", "newsletter", "bulkEnquiry", "checkout", "payment", "coupon", "cartAdd"]) {
      expect(POLICIES).toHaveProperty(name);
    }
    expect(POLICIES.login.some((r) => r.scope === "identity")).toBe(true);
    expect(POLICIES.passwordReset.some((r) => r.scope === "identity")).toBe(true);
  });
  it("login is stricter than ordinary browsing actions", () => {
    const loginIp = POLICIES.login.find((r) => r.scope === "ip")!;
    expect(loginIp.max).toBeLessThanOrEqual(20);
    expect(POLICIES.login.find((r) => r.scope === "identity")!.max).toBeLessThan(loginIp.max);
  });
  it("all limits are positive and windows are sane", () => {
    for (const rules of Object.values(POLICIES)) for (const r of rules) { expect(r.max).toBeGreaterThan(0); expect(r.windowSec).toBeGreaterThanOrEqual(60); }
  });
});
