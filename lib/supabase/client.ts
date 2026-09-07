"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Only ever sees the publishable key, and every table
 * is denied to it by RLS — it exists for auth, not for data access.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase browser config is missing. NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set at build time.",
    );
  }

  return createBrowserClient(url, key, {
    auth: {
      // PKCE, explicitly. Under the implicit flow Supabase returns the session
      // in the URL *fragment* (#access_token=...), which a server-rendered app
      // can never see — the callback route would never fire — and which leaks
      // real tokens into browser history and extensions. PKCE returns a
      // single-use ?code= that only our server can exchange.
      flowType: "pkce",
    },
  });
}
