import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";
import { AuthFragmentFallback } from "./AuthFragmentFallback";

/**
 * Magic-link callback.
 *
 * The PKCE flow lands here with `?code=`, which only the server can exchange.
 * If there is no code the session may be in the URL fragment instead, which is
 * invisible to the server — AuthFragmentFallback picks that up client-side.
 *
 * Either way the allowlist is re-checked here: Supabase has no notion of it, so
 * this is the boundary that keeps the workspace closed.
 */
export const dynamic = "force-dynamic";

export default async function AuthCallbackPage({
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
  const rawNext = first("next") ?? "/dashboard";
  // Only ever redirect to a path on this origin. An open redirect here would
  // hand an attacker a trusted-looking link into their own site.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (first("error") || first("error_description")) {
    redirect("/login?error=expired");
  }

  if (!code) {
    return <AuthFragmentFallback next={next} />;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    redirect("/login?error=expired");
  }

  if (!isAllowedEmail(data.user.email)) {
    // Tear the session down rather than leaving a valid cookie for an account
    // that will be refused on every subsequent request.
    await supabase.auth.signOut();
    redirect("/login?error=not_allowed");
  }

  redirect(next);
}
