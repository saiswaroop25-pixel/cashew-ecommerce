import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

/**
 * Removes what the browser tests created: guest carts (no account) made during the run, and the rate-limit counters
 * from the run. Only rows created after the run started are touched. Uses plain SQL so it does not depend on the
 * generated Prisma client (which Playwright's loader cannot import).
 */
export default async function globalTeardown() {
  const url = process.env.DATABASE_URL;
  const since = process.env.E2E_STARTED_AT;
  if (!url || !since) return;
  const db = new Client({ connectionString: url });
  try {
    await db.connect();
    const carts = await db.query(`delete from "Cart" where "profileId" is null and "createdAt" >= $1`, [since]);
    await db.query(`delete from "RateLimit" where "windowStart" >= $1`, [since]);
    console.log(`e2e cleanup: removed ${carts.rowCount} guest cart(s) and this run's rate-limit counters`);
  } catch (e) {
    console.warn("e2e cleanup failed:", (e as Error).message);
  } finally {
    await db.end().catch(() => {});
  }
}
