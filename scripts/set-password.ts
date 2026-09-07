import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { createClient } from "@supabase/supabase-js";

/**
 * Sets a password for an allowlisted account.
 *
 * Reads the password from stdin with terminal echo disabled, so it never lands
 * in shell history, a process list, an env file, or a chat transcript. That is
 * the entire reason this prompts rather than taking an argument.
 *
 *   npx tsx scripts/set-password.ts swapnil@sorvexai.com
 */

const ETX = 3; // Ctrl-C
const LF = 10;
const CR = 13;
const BACKSPACE_CODES = new Set([8, 127]);

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      reject(
        new Error(
          "This script needs an interactive terminal so the password can be " +
            "hidden. Run it directly in your shell, not through a pipe.",
        ),
      );
      return;
    }

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const onData = (chunk: string) => {
      for (const char of chunk) {
        const code = char.charCodeAt(0);

        if (code === LF || code === CR) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }

        if (code === ETX) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }

        if (BACKSPACE_CODES.has(code)) {
          value = value.slice(0, -1);
          continue;
        }

        // Ignore other control characters (arrow keys arrive as escape
        // sequences and would otherwise end up inside the password).
        if (code < 32) continue;

        value += char;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/set-password.ts <email>");
    process.exit(1);
  }

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(email)) {
    console.error(
      `Refusing: ${email} is not in ALLOWED_EMAILS.\n` +
        `Currently allowed: ${allowed.join(", ") || "(none)"}`,
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const password = await promptHidden(`New password for ${email}: `);
  const confirm = await promptHidden("Confirm: ");

  if (password !== confirm) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  // This account can read every client contract in the system. A short password
  // is not a reasonable trade for one person's convenience.
  if (password.length < 12) {
    console.error("Too short. Use at least 12 characters.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const user = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(`No account for ${email}. Run scripts/invite-user.ts first.`);
    process.exit(1);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;

  console.log(`\nPassword set for ${email}. Sign in at /login.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
