import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Access control.
 *
 * Signup is closed: there is no signup route, and `ALLOWED_EMAILS` is the only
 * gate that matters. Supabase will happily issue a magic link to any address, so
 * the allowlist is enforced HERE, on every protected request — not just once at
 * the callback. A leaked or replayed link is therefore still useless.
 */

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (env.ALLOWED_EMAILS.length === 0) return false; // fail closed
  return env.ALLOWED_EMAILS.includes(email.toLowerCase().trim());
}

export interface SessionUser {
  id: string;
  supabaseUserId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MEMBER";
  organizationId: string;
}

/**
 * Resolves the signed-in user, or null.
 *
 * Uses getUser() rather than getSession(): getSession reads the cookie without
 * verifying it against the auth server, so it can be spoofed. getUser validates
 * the JWT server-side.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return null;
  if (!isAllowedEmail(user.email)) return null;

  const email = user.email.toLowerCase();

  // Link the seeded row to the Supabase identity on first login. The seed
  // cannot know the id in advance because Supabase mints it at sign-up.
  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser) return null;

  if (dbUser.supabaseUserId !== user.id) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { supabaseUserId: user.id, lastLoginAt: new Date() },
    });
  } else {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() },
    });
  }

  return {
    id: dbUser.id,
    supabaseUserId: user.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
  };
}

/** Guard for protected pages. Redirects rather than throwing. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The tenancy scope every repository takes.
 *
 * Repositories accept this rather than a raw organizationId string so a caller
 * cannot fabricate a scope for an organisation they are not a member of.
 */
export interface OrgScope {
  organizationId: string;
  userId: string;
}

export async function requireOrgScope(): Promise<OrgScope> {
  const user = await requireUser();
  return { organizationId: user.organizationId, userId: user.id };
}
