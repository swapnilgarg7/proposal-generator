"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Completes sign-in when the session arrives in the URL fragment instead of as
 * a `?code=` query parameter.
 *
 * The normal browser flow is PKCE and never reaches this. But admin-generated
 * links (and a few email clients that rewrite URLs) still produce implicit-flow
 * fragments, and without this the user just sees "link is no longer valid" with
 * no way to tell why.
 *
 * The fragment is stripped from history immediately: it contains a real access
 * token, and leaving it in the address bar leaves it in browser history.
 */
export function AuthFragmentFallback({ next }: { next: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setFailed(true);
      return;
    }

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setFailed(true);
      return;
    }

    // Drop the tokens out of the URL before doing anything else.
    window.history.replaceState(null, "", window.location.pathname);

    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setFailed(true);
          return;
        }
        // Full navigation, not a router push: the server needs to read the
        // freshly written session cookie.
        window.location.replace(next);
      })
      .catch(() => setFailed(true));
  }, [next]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        {failed ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">That link didn&rsquo;t work</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/50">
              It may have expired or already been used.
            </p>
            <a
              href="/login"
              className="mt-5 inline-block text-sm font-medium text-accent-violet hover:underline"
            >
              Request a new link
            </a>
          </>
        ) : (
          <p className="text-sm text-white/50">Signing you in…</p>
        )}
      </div>
    </main>
  );
}
