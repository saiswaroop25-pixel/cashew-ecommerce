import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { POLICIES, TOO_MANY, clientIp, secondsLeftInWindow, windowStartFor, type PolicyName } from "@/lib/security/rate-limit";

/** Stored keys are hashes: the table never contains a raw IP address or email. */
const digest = (v: string) => createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "cashew"}:${v.toLowerCase()}`).digest("hex").slice(0, 32);

/** Atomically adds one to a counter and returns the new value (one round trip, safe under concurrency). */
export async function hit(key: string, windowSec: number, now = new Date()): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count")
    VALUES (${key}, ${windowStartFor(now, windowSec)}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  return rows[0].count;
}

export type Verdict = { allowed: true } | { allowed: false; retryAfterSec: number; message: string };

/**
 * Counts this attempt against every rule of the policy and says whether it may proceed.
 * `identity` (e.g. the email being logged into) enables the per-account rules.
 * If the limiter itself fails (database hiccup) it FAILS OPEN: a limiter outage must not take the shop down.
 */
export async function checkRateLimit(policy: PolicyName, ctx: { ip: string; identity?: string }, now = new Date()): Promise<Verdict> {
  try {
    let worst = 0;
    for (const rule of POLICIES[policy]) {
      const subject = rule.scope === "ip" ? ctx.ip : ctx.identity;
      if (!subject) continue; // account rule without an identity: nothing to count
      const count = await hit(`${policy}:${rule.scope}:${digest(subject)}`, rule.windowSec, now);
      if (count > rule.max) worst = Math.max(worst, secondsLeftInWindow(now, rule.windowSec));
    }
    return worst === 0 ? { allowed: true } : { allowed: false, retryAfterSec: worst, message: TOO_MANY(worst) };
  } catch (e) {
    console.error("rate limiter failed - allowing the request", policy, e);
    return { allowed: true };
  }
}

/**
 * One-liner for Server Actions:
 *   const limited = await rateLimited("login", email);  if (limited) return { ok: false, message: limited };
 */
export async function rateLimited(policy: PolicyName, identity?: string): Promise<string | null> {
  const h = await headers();
  const verdict = await checkRateLimit(policy, { ip: clientIp((n) => h.get(n)), identity });
  return verdict.allowed ? null : verdict.message;
}

/** Housekeeping (called by the maintenance cron): drop counters whose window ended long ago. */
export async function purgeRateLimits(olderThanHours = 24) {
  const cutoff = new Date(Date.now() - olderThanHours * 3_600_000);
  return (await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: cutoff } } })).count;
}
