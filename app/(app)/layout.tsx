import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Authenticated shell. `requireUser()` re-checks the email allowlist on every
 * request, so revoking access is a config change rather than a session hunt.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // `built: false` renders the label without a link. These routes are in the
  // plan but do not exist yet, and a nav item that 404s is worse than one that
  // says "not yet": the first looks like the app is broken, the second like it
  // is unfinished. Flip the flag when the route lands.
  const nav = [
    { href: "/dashboard", label: "Dashboard", built: true },
    { href: "/proposals", label: "Proposals", built: true },
    { href: "/clients", label: "Clients", built: false },
    { href: "/library", label: "Library", built: false },
    { href: "/settings", label: "Settings", built: false },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[80rem] items-center gap-8 px-6">
          <Link href="/dashboard" className="shrink-0 text-[0.9375rem] font-semibold tracking-[-0.01em]">
            Sorvex<span className="text-gradient-brand">Proposals</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((item) =>
              item.built ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.href}
                  title="Not built yet"
                  aria-disabled="true"
                  className="cursor-default whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/25"
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-white/40 sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[80rem] px-6 py-10">{children}</main>
    </div>
  );
}
