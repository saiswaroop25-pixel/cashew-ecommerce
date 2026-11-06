// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

/**
 * Every protected action must stop at the rate limiter BEFORE doing any work: no database, no Supabase,
 * no payment call. The limiter says "no" here, and any other dependency explodes if touched.
 */
vi.mock("@/services/rate-limit", () => ({ rateLimited: vi.fn(async () => "Too many attempts. Please try again in a minute.") }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get: () => { throw new Error("DB_TOUCHED"); } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => { throw new Error("SUPABASE_TOUCHED"); } }));
vi.mock("@/lib/auth/dal", () => ({
  getSessionUser: async () => { throw new Error("AUTH_TOUCHED"); },
  getProfile: async () => { throw new Error("AUTH_TOUCHED"); },
  requireUser: async () => { throw new Error("AUTH_TOUCHED"); },
  requireAdmin: async () => { throw new Error("AUTH_TOUCHED"); },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); }, notFound: () => { throw new Error("NOT_FOUND"); } }));

import { signIn, signUp, requestPasswordReset } from "@/app/actions/auth";
import { submitBulkEnquiry } from "@/app/actions/bulk";
import { addToCart, applyCoupon } from "@/app/actions/cart";
import { placeOrder } from "@/app/actions/checkout";
import { subscribeNewsletter } from "@/app/actions/newsletter";
import { startPayment } from "@/app/actions/payment";
import { rateLimited } from "@/services/rate-limit";

const form = (o: Record<string, string> = {}) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ email: "a@b.co", password: "x", code: "SAVE10", ...o })) fd.set(k, v);
  return fd;
};
const idle = { ok: false };

describe("rate-limited actions stop before doing any work", () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ["signUp", () => signUp(idle, form()), "signup"],
    ["signIn", () => signIn(idle, form()), "login"],
    ["requestPasswordReset", () => requestPasswordReset(idle, form()), "passwordReset"],
    ["subscribeNewsletter", () => subscribeNewsletter({ ok: false, message: "" }, form()), "newsletter"],
    ["submitBulkEnquiry", () => submitBulkEnquiry(idle, form()), "bulkEnquiry"],
    ["placeOrder", () => placeOrder(idle, form()), "checkout"],
    ["startPayment", () => startPayment("order1", "token"), "payment"],
    ["applyCoupon", () => applyCoupon(idle, form()), "coupon"],
    ["addToCart", () => addToCart("variant1", 1), "cartAdd"],
  ];

  for (const [name, run, policy] of cases) {
    it(`${name} uses the "${policy}" policy and returns the limiter's message`, async () => {
      vi.mocked(rateLimited).mockClear();
      const result = (await run()) as { ok: boolean; message?: string };
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/Too many attempts/);
      expect(vi.mocked(rateLimited).mock.calls[0][0]).toBe(policy);
    });
  }

  it("sign-in and password reset limit per ACCOUNT as well (they pass the email as the identity)", async () => {
    vi.mocked(rateLimited).mockClear();
    await signIn(idle, form({ email: "  Victim@Example.com " }));
    await requestPasswordReset(idle, form({ email: "victim@example.com" }));
    expect(vi.mocked(rateLimited).mock.calls[0][1]).toBe("Victim@Example.com");
    expect(vi.mocked(rateLimited).mock.calls[1][1]).toBe("victim@example.com");
  });
});
