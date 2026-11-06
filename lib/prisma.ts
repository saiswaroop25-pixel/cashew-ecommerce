import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Dev only: keep the connection open between page loads. Opening a new database connection generates random
  // bytes (password handshake), which Next's dev checks flag as "crypto.getRandomValues() while prerendering"
  // whenever it happens during a page render after the default 10-second idle timeout.
  const dev = process.env.NODE_ENV !== "production";
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, ...(dev ? { idleTimeoutMillis: 30 * 60_000 } : {}) }) });
}

/** Singleton so hot reload in dev does not exhaust database connections. */
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  void prisma.$connect().catch(() => {}); // open the first connection now, outside any page render
}
