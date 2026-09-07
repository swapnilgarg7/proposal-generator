import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const raw = params.error;
  const error = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-accent-violet">
            Sorvex Proposals
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            We&rsquo;ll email you a link. No password to remember.
          </p>
        </div>

        <LoginForm initialError={errorMessage(error)} />

        <p className="mt-8 text-xs leading-relaxed text-white/35">
          This workspace is invite-only. Sign-ups are closed, and links only work
          for addresses already on the account.
        </p>
      </div>
    </main>
  );
}

/**
 * Deliberately uniform: none of these reveal whether an address exists on the
 * account. Someone probing with a stranger's email learns nothing.
 */
function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case "not_allowed":
      return "That address can't sign in to this workspace.";
    case "expired":
      return "That link has expired. Request a new one below.";
    case "invalid":
      return "That link is no longer valid. Request a new one below.";
    case undefined:
      return null;
    default:
      return "Something went wrong signing you in. Try again.";
  }
}
