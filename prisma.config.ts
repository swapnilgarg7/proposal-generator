import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * The Prisma 7 CLI no longer auto-loads .env, and Next.js keeps local secrets
 * in .env.local rather than .env — so load both explicitly, .env.local first
 * since it wins in Next's own precedence order.
 */
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

if (!process.env.DIRECT_URL) {
  throw new Error(
    "DIRECT_URL is not set. Prisma CLI commands connect directly on port 5432; " +
      "migrations hang silently over the transaction pooler. Copy .env.example " +
      "to .env.local and fill it in.",
  );
}

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
