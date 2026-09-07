import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Authenticated shell. `requireUser()` re-checks the email allowlist on every
 * request, so revoking access is a config change rather than a session hunt.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/proposals", label: "Proposals" },
    { href: "/clients", label: "Clients" },
    { href: "/library", label: "Library" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[80rem] items-center gap-8 px-6">
          <Link href="/dashboard" className="shrink-0 text-[0.9375rem] font-semibold tracking-[-0.01em]">
            Sorvex<span className="text-gradient-brand">Proposals</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
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
