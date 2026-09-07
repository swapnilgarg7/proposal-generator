import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { createClient } from "@supabase/supabase-js";

/**
 * Creates the Supabase auth identity for an allowlisted address.
 *
 * Sign-ups are closed and the login form passes `shouldCreateUser: false`, so
 * there is deliberately no self-serve path — an account has to be created here,
 * by someone holding the service role key.
 *
 * Refuses any address not in ALLOWED_EMAILS: creating an auth user who would
 * then be rejected on every request is just a confusing dead end.
 *
 *   npx tsx scripts/invite-user.ts swapnil@sorvexai.com
 */

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/invite-user.ts <email>");
    process.exit(1);
  }

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(email)) {
    console.error(
      `Refusing: ${email} is not in ALLOWED_EMAILS.\n` +
        `Currently allowed: ${allowed.join(", ") || "(none)"}\n` +
        `Add it to .env.local first, or this account could never sign in.`,
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    console.log(`= ${email} already exists (${existing.id})`);
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    // No password is ever set: sign-in is magic-link only, so there is no
    // password to phish, reuse or leak.
    email_confirm: true,
  });
  if (error) throw error;

  console.log(`+ created ${email} (${data.user.id})`);
  console.log(`  Sign in at /login — the link is emailed by Supabase.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
