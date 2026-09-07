import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env, requireSupabaseBrowserConfig } from "@/lib/env";

/**
 * Server-side Supabase clients.
 *
 * Two distinct clients, kept separate on purpose:
 *
 *  - `createSupabaseServerClient()` acts AS THE USER. It carries their session
 *    cookie and is bound by RLS. Use it for auth.
 *  - `createSupabaseAdminClient()` uses the service role key and bypasses RLS
 *    entirely. Use it only for Storage writes and never in response to
 *    unauthenticated input.
 */

export async function createSupabaseServerClient() {
  const { url, publishableKey } = requireSupabaseBrowserConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // session refresh in proxy.ts handles writing them, so this is safe
          // to swallow rather than crash the render.
        }
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS completely.
 *
 * Never expose this to the browser, and never drive it directly from
 * unauthenticated request data — it is the one credential in the system with no
 * safety net behind it.
 */
export function createSupabaseAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required for Storage writes " +
        "(sealed PDFs, signature images). Find it in Supabase under " +
        "Settings -> API Keys.",
    );
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
