import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires a driver adapter; there is no Rust query engine holding its
 * own connection pool any more. That has a useful consequence for us: the
 * legacy `?pgbouncer=true` connection-string flag existed to stop the Rust
 * engine emitting *named* prepared statements (s0, s1, ...), which break under
 * PgBouncer/Supavisor transaction pooling with intermittent
 * `prepared statement "s0" already exists` errors. node-postgres uses unnamed
 * portals unless you explicitly name a query, so that failure mode does not
 * apply here and the flag is inert. Left documented rather than cargo-culted.
 *
 * `connection_limit` equivalent: node-postgres `max`. Serverless instances are
 * reused with in-instance concurrency, so a hard 1 can serialise concurrent
 * requests behind a single connection. Starting small and measuring against
 * Supavisor's client count in the Supabase dashboard beats guessing.
 */

const isProd = env.NODE_ENV === "production";

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: isProd ? 3 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Fail a wedged query rather than holding a pooled connection forever.
    statement_timeout: 30_000,
    query_timeout: 30_000,
  });

  return new PrismaClient({
    adapter,
    log: isProd ? ["error", "warn"] : ["error", "warn"],
  });
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

/**
 * Internal handle. Route handlers and server components should NOT import this
 * directly — go through `lib/repositories/*`, which take an OrgScope and apply
 * the `organizationId` filter for you. Tenancy leaks come from a single
 * forgotten `where`, and a repository layer is the only reliable fix.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!isProd) globalForPrisma.prisma = prisma;
