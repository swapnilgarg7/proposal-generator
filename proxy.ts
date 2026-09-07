import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Security headers and Supabase session refresh.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this is that file.
 *
 * Refreshing the session here rather than in a Server Component matters: Server
 * Components cannot write cookies, so without this pass an expiring token would
 * never be renewed and the user would be silently logged out mid-session.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Auth is optional infrastructure: the public proposal viewer must keep
  // working even when Supabase auth is unconfigured.
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // getUser() validates the JWT against the auth server. getSession() only
    // reads the cookie, which can be spoofed.
    await supabase.auth.getUser();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/p/")) {
    // A proposal names a client, their stated problems and their pricing. The
    // URL is the credential, so it must never be indexed or cached by an
    // intermediary, and must not leak via Referer.
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", response.headers.get("Referrer-Policy") ?? "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  // Webhooks are excluded so their raw request body reaches the handler
  // untouched — Stripe verifies its signature against exact bytes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
