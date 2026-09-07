"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

/**
 * Sign-in.
 *
 * Password is the default rather than magic link, because magic link makes
 * sign-in depend on outbound email — and Supabase's built-in mailer is capped at
 * a couple of messages an hour and is not intended for production. Locking
 * yourself out of your own tool because an email did not send is a bad trade for
 * a single-user workspace.
 *
 * Magic link stays available for when real SMTP is configured.
 */
export function LoginForm({ initialError }: { initialError: string | null }) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(initialError);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    setStatus("working");
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setStatus("idle");
        // Uniform message: distinguishing "no such account" from "wrong
        // password" would let someone enumerate who has access.
        setError(
          error.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : "That email and password don't match.",
        );
        return;
      }

      // Full navigation rather than a router push: the server needs to read the
      // session cookie the client just wrote.
      window.location.assign("/dashboard");
    } catch {
      setStatus("idle");
      setError("Couldn't sign you in. Try again.");
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (status === "working") return;

    setStatus("working");
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Closed workspace: a magic link must never create an account.
          shouldCreateUser: false,
        },
      });

      if (error) {
        setStatus("idle");
        // A rate limit is a property of the mail service, not of whether this
        // address exists, so naming it leaks nothing and saves a lot of
        // confusion.
        if (error.status === 429) {
          setError(
            "Supabase's built-in mailer has hit its hourly limit. Use a password instead, " +
              "or configure custom SMTP.",
          );
        } else {
          setError("Couldn't send that link. Check the address and try again.");
        }
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("Couldn't send that link. Check the address and try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="font-medium text-foreground">Check your inbox</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/50">
          If <span className="text-white/75">{email}</span> can access this workspace, a sign-in link
          is on its way. It expires in an hour.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-accent-violet hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const isMagic = mode === "magic";

  return (
    <form onSubmit={isMagic ? sendMagicLink : signInWithPassword} className="space-y-3">
      <div>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sorvexai.com"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[0.9375rem] text-foreground outline-none transition-colors placeholder:text-white/25 focus:border-accent-violet/60"
        />
      </div>

      {!isMagic ? (
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[0.9375rem] text-foreground outline-none transition-colors placeholder:text-white/25 focus:border-accent-violet/60"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={
          status === "working" ||
          email.trim().length === 0 ||
          (!isMagic && password.length === 0)
        }
        className="w-full rounded-xl px-4 py-3 text-[0.9375rem] font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }}
      >
        {status === "working"
          ? isMagic
            ? "Sending…"
            : "Signing in…"
          : isMagic
            ? "Email me a link"
            : "Sign in"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(isMagic ? "password" : "magic");
          setError(null);
        }}
        className="w-full pt-1 text-center text-sm text-white/40 transition-colors hover:text-white/70"
      >
        {isMagic ? "Use a password instead" : "Email me a sign-in link instead"}
      </button>
    </form>
  );
}
