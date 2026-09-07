"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Closed workspace: a magic link must never create an account. The
          // server-side allowlist is the real gate, but this stops stray
          // Supabase users being created at all.
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch {
      // Same message regardless of cause, so this cannot be used to enumerate
      // which addresses exist on the account.
      setStatus("idle");
      setError("Couldn't send that link. Check the address and try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="font-medium text-foreground">Check your inbox</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/50">
          If <span className="text-white/75">{email}</span> can access this
          workspace, a sign-in link is on its way. It expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-accent-violet hover:underline"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sorvexai.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[0.9375rem] text-foreground outline-none transition-colors placeholder:text-white/25 focus:border-accent-violet/60"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending" || email.trim().length === 0}
        className="w-full rounded-xl px-4 py-3 text-[0.9375rem] font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }}
      >
        {status === "sending" ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}
