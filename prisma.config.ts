import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; load it (and .env as a fallback) for the Prisma CLI.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
