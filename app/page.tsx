import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthFragmentFallback } from "@/app/auth/callback/AuthFragmentFallback";

export const dynamic = "force-dynamic";

/**
 * Root route.
 *
 * Also absorbs auth callbacks that land here by mistake. Supabase does not error
 * when a requested `emailRedirectTo` is missing from its Redirect URLs
 * allowlist — it silently falls back to the project's Site URL, which drops the
 * user on `/?code=...` with nothing to consume the code. Rather than dead-ending
 * on a blank redirect, forward it to the real callback.
 *
 * This is a safety net, not the fix. The fix is listing every origin in
 * Supabase → Authentication → URL Configuration → Redirect URLs; see CLAUDE.md.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const code = first("code");
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }

  // An implicit-flow session arrives in the URL fragment, which the server
  // cannot see. If the provider bounced here with an auth-shaped URL, hand off
  // to the client-side handler.
  if (first("error") || first("error_description")) {
    redirect("/login?error=expired");
  }

  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
