import { z } from "zod";

/**
 * Server-side environment. Validated once, at import time, so a missing
 * variable fails at boot with a readable message rather than as an
 * undefined-shaped bug three layers into a request.
 *
 * NEVER import this from a client component — it would leak secrets into
 * the browser bundle. Client-visible values live in `publicEnv` below.
 */
/**
 * An optional variable that may be present but blank.
 *
 * `.optional()` alone accepts `undefined` but rejects `""`, and .env files are
 * full of empty placeholders — `KEY=""` is how you say "not set yet". Without
 * this, a blank line in .env.local takes the whole app down with a confusing
 * "expected string to have >=1 characters".
 */
const optionalString = () =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional(),
  );

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database — pooled for the app, direct for migrations.
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Supabase.
  // The publishable key is optional here on purpose: it is needed only for
  // auth and Storage, and requiring it would stop the entire app booting
  // (including database access and the public proposal viewer, neither of
  // which touch it). `requireSupabaseBrowserConfig()` below fails loudly at
  // the point it is actually needed.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString(),
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),

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
  ANTHROPIC_API_KEY: optionalString(),
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

/**
 * Supabase browser config, asserted at the point of use.
 *
 * Auth and Storage need the publishable key; the database and the public
 * proposal viewer do not. Checking here rather than at boot means a missing key
 * breaks sign-in with a clear message instead of taking the whole app down.
 */
export function requireSupabaseBrowserConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set, so Supabase Auth and " +
        "Storage cannot be used. Find it in your Supabase project under " +
        "Settings -> API Keys (it starts with \"sb_publishable_\") and add it " +
        "to .env.local.",
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
