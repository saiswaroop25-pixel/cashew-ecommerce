import { describe, expect, it } from "vitest";
import { PRIVATE_PATHS, buildCsp, privateCacheHeaders, securityHeaders } from "@/lib/security/headers";

const prod = { isDev: false, supabaseHost: "abc123.supabase.co" };
const dir = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(name + " ")) ?? "";

describe("buildCsp", () => {
  const csp = buildCsp(prod);

  it("locks down the dangerous basics", () => {
    expect(dir(csp, "default-src")).toBe("default-src 'self'");
    expect(dir(csp, "object-src")).toBe("object-src 'none'");
    expect(dir(csp, "base-uri")).toBe("base-uri 'self'");
    expect(dir(csp, "form-action")).toBe("form-action 'self'");
    expect(dir(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("allows scripts only from self and Razorpay (never a wildcard or http:)", () => {
    const s = dir(csp, "script-src");
    expect(s).toContain("https://checkout.razorpay.com");
    expect(s).not.toMatch(/\*|http:|unsafe-eval|data:/);
  });
  it("lets the browser talk to Supabase (uploads) and Razorpay, and show images from them", () => {
    expect(dir(csp, "connect-src")).toContain("https://abc123.supabase.co");
    expect(dir(csp, "connect-src")).toContain("https://api.razorpay.com");
    expect(dir(csp, "img-src")).toContain("https://abc123.supabase.co");
    expect(dir(csp, "frame-src")).toContain("https://api.razorpay.com");
  });
  it("does not allow framing of third parties other than the payment provider", () => {
    expect(dir(csp, "frame-src")).not.toMatch(/\*(?!\.razorpay)|youtube|google/);
  });
  it("development adds eval + websockets for hot reload but never in production", () => {
    const dev = buildCsp({ ...prod, isDev: true });
    expect(dir(dev, "script-src")).toContain("'unsafe-eval'");
    expect(dir(dev, "connect-src")).toContain("ws://localhost:*");
    expect(dev).not.toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("localhost");
  });
  it("works without a configured Supabase host (no stray 'https://null')", () => {
    expect(buildCsp({ isDev: false, supabaseHost: null })).not.toMatch(/null|undefined/);
  });
});

describe("securityHeaders", () => {
  const h = Object.fromEntries(securityHeaders(prod).map((x) => [x.key, x.value]));
  it("sets the standard hardening headers", () => {
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(h["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(h["Permissions-Policy"]).toMatch(/microphone=\(\)/);
    expect(h["Permissions-Policy"]).toMatch(/geolocation=\(\)/);
    expect(h["Content-Security-Policy"]).toBeTruthy();
  });
  it("sends HSTS only in production (it would pin http://localhost in a developer's browser)", () => {
    const dev = securityHeaders({ ...prod, isDev: true }).map((x) => x.key);
    expect(dev).not.toContain("Strict-Transport-Security");
  });
  it("private pages are marked no-store", () => {
    expect(PRIVATE_PATHS).toEqual(expect.arrayContaining(["/admin/:path*", "/account/:path*", "/cart", "/checkout/:path*"]));
    expect(privateCacheHeaders[0].value).toMatch(/no-store/);
  });
});
