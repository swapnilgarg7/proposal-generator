import { z } from "zod";

/**
 * Server-side environment. Validated once, at import time, so a missing
 * variable fails at boot with a readable message rather than as an
 * undefined-shaped bug three layers into a request.
 *
 * NEVER import this from a client component — it would leak secrets into
 * the browser bundle. Client-visible values live in `publicEnv` below.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database — pooled for the app, direct for migrations.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Access control. Signup is closed; only these addresses may log in.
  ALLOWED_EMAILS: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),

  // Public origin, used to build client-facing proposal links.
  APP_URL: z.string().url().default("http://localhost:3000"),

  // AI. `local-cli` shells out to Claude Code on this machine and is
  // hard-gated to non-production; `anthropic-api` is what runs on Vercel.
  AI_PROVIDER: z.enum(["local-cli", "anthropic-api", "disabled"]).default("disabled"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),

  // Feature flags
  ENABLE_SIGNUPS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

function loadServerEnv() {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }

  const env = parsed.data;

  // The local CLI provider authenticates against a Claude Code session on
  // this machine. It cannot exist on Vercel, so refuse to start rather than
  // fail confusingly at first generation.
  if (env.AI_PROVIDER === "local-cli" && env.NODE_ENV === "production") {
    throw new Error(
      `AI_PROVIDER="local-cli" is not usable in production: it requires a local ` +
        `Claude Code session. Set AI_PROVIDER="anthropic-api" (with ANTHROPIC_API_KEY) ` +
        `or "disabled" for production deployments.`,
    );
  }

  if (env.AI_PROVIDER === "anthropic-api" && !env.ANTHROPIC_API_KEY) {
    throw new Error(`AI_PROVIDER="anthropic-api" requires ANTHROPIC_API_KEY to be set.`);
  }

  return env;
}

export const env = loadServerEnv();

export type ServerEnv = typeof env;
