import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * Connection URLs live here rather than in schema.prisma, and the Prisma 7 CLI
 * no longer auto-loads .env — hence the explicit `dotenv/config` import above.
 *
 * Two URLs, deliberately:
 *  - DATABASE_URL points at Supabase's Supavisor pooler (port 6543, transaction
 *    mode). This is what the app uses on serverless.
 *  - DIRECT_URL points at the database directly (port 5432). Migrations MUST
 *    use this: `prisma migrate` issues statements that do not work over a
 *    transaction pooler, and the failure mode is a silent hang rather than an
 *    error, which is miserable to debug.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  // The CLI (migrate, db push, studio) connects DIRECTLY on port 5432.
  // `prisma migrate` issues statements that do not work over a transaction
  // pooler, and the failure mode is a silent hang rather than an error.
  // The application runtime is separate: lib/db.ts passes the POOLED
  // DATABASE_URL to the driver adapter.
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
