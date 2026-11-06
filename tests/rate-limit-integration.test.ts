// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.50" }) }));

import { prisma } from "@/lib/prisma";
import { POLICIES } from "@/lib/security/rate-limit";
import { checkRateLimit, hit, purgeRateLimits, rateLimited } from "@/services/rate-limit";

const TAG = "zzt" + randomBytes(4).toString("hex");
const NOW = new Date("2031-03-10T12:03:30Z"); // a fixed time far in the future: never collides with real counters

afterAll(async () => {
  // only counters from the far-future test windows (and any left by the header-based test below)
  await prisma.rateLimit.deleteMany({ where: { windowStart: { gte: new Date("2031-01-01") } } });
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: `zztkey:${TAG}` } } });
  await prisma.$disconnect();
});

describe("hit() counter", () => {
  it("is atomic: 25 simultaneous requests get exactly the numbers 1..25, none lost or duplicated", async () => {
    const key = `zztkey:${TAG}:race`;
    const counts = await Promise.all(Array.from({ length: 25 }, () => hit(key, 600, NOW)));
    expect([...counts].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
  it("counts each window separately", async () => {
    const key = `zztkey:${TAG}:win`;
    expect(await hit(key, 600, NOW)).toBe(1);
    expect(await hit(key, 600, NOW)).toBe(2);
    expect(await hit(key, 600, new Date(NOW.getTime() + 600_000))).toBe(1); // next window starts again
  });
});

describe("checkRateLimit()", () => {
  it("login: the 7th attempt against ONE account is blocked even from a fresh address", async () => {
    const identity = `${TAG}-victim@example.test`;
    const maxPerAccount = POLICIES.login.find((r) => r.scope === "identity")!.max; // 6
    for (let i = 1; i <= maxPerAccount; i++) {
      expect((await checkRateLimit("login", { ip: `198.51.100.${i}`, identity }, NOW)).allowed).toBe(true); // attacker rotates IPs
    }
    const blocked = await checkRateLimit("login", { ip: "198.51.100.200", identity }, NOW);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.retryAfterSec).toBeLessThanOrEqual(600);
      expect(blocked.message).toMatch(/Too many attempts/);
    }
    // a different account from a clean address is unaffected
    expect((await checkRateLimit("login", { ip: "198.51.100.201", identity: `${TAG}-other@example.test` }, NOW)).allowed).toBe(true);
  });

  it("login: one address trying many accounts is blocked after the per-address limit", async () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 10}`;
    const maxPerIp = POLICIES.login.find((r) => r.scope === "ip")!.max; // 15
    for (let i = 1; i <= maxPerIp; i++) expect((await checkRateLimit("login", { ip, identity: `${TAG}-u${i}@example.test` }, NOW)).allowed).toBe(true);
    expect((await checkRateLimit("login", { ip, identity: `${TAG}-u99@example.test` }, NOW)).allowed).toBe(false);
  });

  it("a blocked visitor is allowed again once the window has passed", async () => {
    const identity = `${TAG}-later@example.test`;
    for (let i = 0; i < 8; i++) await checkRateLimit("login", { ip: "198.51.100.77", identity }, NOW);
    expect((await checkRateLimit("login", { ip: "198.51.100.77", identity }, NOW)).allowed).toBe(false);
    const later = new Date(NOW.getTime() + 11 * 60_000);
    expect((await checkRateLimit("login", { ip: "198.51.100.77", identity }, later)).allowed).toBe(true);
  });

  it("rules that need an identity are skipped when there is none", async () => {
    // passwordReset has an account rule (3/h) - without an identity only the address rule (6/h) applies
    const ip = "198.51.100.88";
    for (let i = 0; i < 6; i++) expect((await checkRateLimit("passwordReset", { ip }, NOW)).allowed).toBe(true);
    expect((await checkRateLimit("passwordReset", { ip }, NOW)).allowed).toBe(false);
  });

  it("stores only hashes: the table never contains a raw email or IP", async () => {
    const identity = `${TAG}-private@example.test`;
    await checkRateLimit("coupon", { ip: "198.51.100.99", identity }, NOW);
    const rows = (await prisma.rateLimit.findMany({ where: { windowStart: { gte: new Date("2031-01-01") } } })).filter((r) => !r.key.startsWith("zztkey:")); // real limiter keys only
    const allKeys = rows.map((r) => r.key).join("\n");
    expect(allKeys).not.toContain("198.51.100.99");
    expect(allKeys).not.toContain(identity);
    expect(allKeys).not.toContain("@");
    expect(rows.every((r) => /^[a-zA-Z]+:(ip|identity):[0-9a-f]{32}$/.test(r.key))).toBe(true);
  });

  it("FAILS OPEN: a limiter/database error never blocks a customer", async () => {
    const spy = vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await checkRateLimit("checkout", { ip: "198.51.100.5" }, NOW)).allowed).toBe(true);
    expect(err).toHaveBeenCalled();
    spy.mockRestore();
    err.mockRestore();
  });
});

describe("rateLimited() helper (reads the client address from request headers)", () => {
  it("returns null while under the limit and a message once over it", async () => {
    // Uses today's real window, so use the tightest policy and a key unique to this run via the identity.
    const identity = `${TAG}-helper@example.test`;
    const results: (string | null)[] = [];
    for (let i = 0; i < 8; i++) results.push(await rateLimited("login", identity));
    expect(results.slice(0, 6).every((r) => r === null)).toBe(true);
    expect(results[6]).toMatch(/Too many attempts/);
  });
});

describe("purgeRateLimits()", () => {
  it("removes old counters and keeps recent ones", async () => {
    const old = new Date(Date.now() - 3 * 86_400_000);
    await prisma.rateLimit.create({ data: { key: `zztkey:${TAG}:old`, windowStart: old, count: 3 } });
    await prisma.rateLimit.create({ data: { key: `zztkey:${TAG}:fresh`, windowStart: new Date(), count: 1 } });
    await purgeRateLimits(24);
    expect(await prisma.rateLimit.count({ where: { key: `zztkey:${TAG}:old` } })).toBe(0);
    expect(await prisma.rateLimit.count({ where: { key: `zztkey:${TAG}:fresh` } })).toBe(1);
  });
});
