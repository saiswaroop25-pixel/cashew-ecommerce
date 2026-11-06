import { timingSafeEqual } from "node:crypto";

/**
 * Scheduled-job authentication: the caller must send "Authorization: Bearer <CRON_SECRET>"
 * (Vercel Cron and GitHub Actions can both do this). Compared in constant time.
 */
export function isAuthorisedCron(authorizationHeader: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false; // a missing or trivially short secret never authorises anything
  const given = Buffer.from(authorizationHeader ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
