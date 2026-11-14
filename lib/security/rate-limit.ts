/**
 * Rate-limit rules and helpers (pure, unit tested). The database part lives in services/rate-limit.ts.
 *
 * Fixed windows: a counter per (key, window). Simple, cheap, and good enough to stop password guessing,
 * sign-up/enquiry spam and coupon brute-forcing. A determined attacker rotating IPs is a job for a CDN/WAF
 * (Vercel Firewall / Cloudflare) - this layer is the always-on baseline.
 */
export type RuleScope = "ip" | "identity";
export type Rule = { scope: RuleScope; max: number; windowSec: number };

export const POLICIES = {
  // Credential stuffing: limit per address AND per account being targeted.
  login: [{ scope: "ip", max: 15, windowSec: 600 }, { scope: "identity", max: 6, windowSec: 600 }],
  signup: [{ scope: "ip", max: 6, windowSec: 3600 }],
  passwordReset: [{ scope: "ip", max: 6, windowSec: 3600 }, { scope: "identity", max: 3, windowSec: 3600 }],
  newsletter: [{ scope: "ip", max: 6, windowSec: 3600 }],
  bulkEnquiry: [{ scope: "ip", max: 6, windowSec: 3600 }],
  dataRequest: [{ scope: "ip", max: 5, windowSec: 3600 }, { scope: "identity", max: 3, windowSec: 86400 }],
  checkout: [{ scope: "ip", max: 25, windowSec: 3600 }],
  payment: [{ scope: "ip", max: 40, windowSec: 3600 }],
  coupon: [{ scope: "ip", max: 20, windowSec: 600 }],
  cartAdd: [{ scope: "ip", max: 200, windowSec: 600 }],
} as const satisfies Record<string, readonly Rule[]>;

export type PolicyName = keyof typeof POLICIES;

/** Start of the fixed window that contains `now`. */
export function windowStartFor(now: Date, windowSec: number): Date {
  const ms = windowSec * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/** Seconds until the current window ends (always at least 1). */
export function secondsLeftInWindow(now: Date, windowSec: number): number {
  const end = windowStartFor(now, windowSec).getTime() + windowSec * 1000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

/**
 * Best-effort client IP. On Vercel (and most proxies) the first entry of x-forwarded-for is the real client.
 * Returns "unknown" when nothing is available (e.g. local development), so everyone shares one bucket rather
 * than bypassing the limiter.
 */
export function clientIp(get: (name: string) => string | null | undefined): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || get("x-real-ip")?.trim() || "";
  // basic sanity: IPv4 / IPv6 characters only, bounded length (never trust header text blindly)
  return /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : "unknown";
}

export function humanWait(seconds: number): string {
  if (seconds < 90) return "a minute";
  const minutes = Math.ceil(seconds / 60);
  return minutes < 90 ? `about ${minutes} minutes` : `about ${Math.ceil(minutes / 60)} hours`;
}

export const TOO_MANY = (seconds: number) => `Too many attempts. Please try again in ${humanWait(seconds)}.`;
