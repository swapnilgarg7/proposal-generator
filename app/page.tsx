import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-20">
      <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-accent-violet">
        Sorvex Proposals
      </p>
      <h1 className="text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl">
        Proposals that{" "}
        <span className="text-gradient-brand">close themselves</span>.
      </h1>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-white/60">
        Internal build in progress. The renderer is live — everything below is a
        real proposal rendered through the same component a client would see.
      </p>

      <nav className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          { href: "/preview", label: "Preview", hint: "Dark theme, interactive" },
          { href: "/preview?theme=light", label: "Light theme", hint: "What clients print" },
          { href: "/preview?print=1", label: "Print mode", hint: "Exactly what the PDF captures" },
          { href: "/preview?agreement=upwork", label: "Upwork agreement", hint: "External contract branch" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="glass rounded-xl px-5 py-4 transition-opacity hover:opacity-80"
          >
            <span className="block font-medium text-foreground">{l.label}</span>
            <span className="mt-0.5 block text-sm text-white/45">{l.hint}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
