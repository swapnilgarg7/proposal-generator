import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers for client-facing proposal links.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this is that
 * file. Webhook routes are excluded from the matcher below so their raw request
 * body reaches the handler untouched.
 *
 * A proposal contains a named client, their stated problems, and pricing. It
 * must never appear in a search index, and it must never be cached by an
 * intermediary — the URL is the credential.
 */
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/p/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}

export const config = {
  // Webhooks must reach their handlers with the raw body untouched: Stripe
  // verifies its signature against exact bytes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
