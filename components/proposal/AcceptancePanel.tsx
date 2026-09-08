"use client";

import { useMemo, useState } from "react";
import { useSelection } from "@/components/proposal/SelectionContext";
import { SignaturePad, renderTypedSignature, type Stroke } from "@/components/proposal/SignaturePad";
import { formatMoney } from "@/lib/pricing";
import { approveExternalAction, signProposalAction } from "@/app/p/[token]/actions";
import { cn } from "@/lib/utils";

/**
 * The control the client actually uses to accept a proposal.
 *
 * Branches on agreement mode, and the difference is legal rather than cosmetic:
 * the inline path collects an electronic signature with a consent record, while
 * the external path collects an approval and says plainly that it is not a
 * signature.
 */
export function AcceptancePanel({
  token,
  agreementMode,
  consentText,
  consentVersion,
  requireTitle,
  externalCtaLabel,
  alreadyAccepted,
  reference,
  acceptedAt,
}: {
  token: string;
  agreementMode: "INLINE_ESIGN" | "EXTERNAL_UPWORK" | "EXTERNAL_OTHER";
  consentText: string;
  consentVersion: string;
  requireTitle: boolean;
  externalCtaLabel: string;
  alreadyAccepted: boolean;
  reference: string;
  acceptedAt: Date | string | null;
}) {
  const isExternal = agreementMode !== "INLINE_ESIGN";
  const { selectedTierKey, selectedAddOnKeys, totals, currency, tiers } = useSelection();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [consented, setConsented] = useState(false);
  const [method, setMethod] = useState<"TYPED" | "DRAWN">("DRAWN");
  const [drawn, setDrawn] = useState<{ dataUrl: string | null; strokes: Stroke[] }>({
    dataUrl: null,
    strokes: [],
  });
  const [status, setStatus] = useState<"idle" | "working" | "done">(
    alreadyAccepted ? "done" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const selectedTier = useMemo(
    () => tiers.find((t) => t.key === selectedTierKey) ?? null,
    [tiers, selectedTierKey],
  );

  if (status === "done") {
    const when = acceptedAt
      ? new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }).format(new Date(acceptedAt))
      : null;

    return (
      <div
        className="rounded-xl border p-6 sm:p-7"
        style={{
          borderColor: "color-mix(in srgb, var(--doc-success) 40%, transparent)",
          background: "color-mix(in srgb, var(--doc-success) 8%, transparent)",
        }}
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: "var(--doc-success)" }}
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
              <path
                d="M3.5 8.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[1.0625rem] font-semibold text-[var(--doc-fg)]">
              {isExternal ? "Scope approved" : "Signed"}
            </p>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--doc-fg-muted)]">
              {isExternal
                ? "Thank you. The contract will follow through Upwork shortly, and work begins once you accept it there."
                : "Thank you. This document is now executed, and your signature appears on it above."}
            </p>

            <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-[var(--doc-border)] pt-5 sm:grid-cols-2">
              <Detail label="Reference" value={reference} mono />
              {when ? <Detail label={isExternal ? "Approved" : "Signed"} value={when} /> : null}
              {selectedTier ? <Detail label="Package" value={selectedTier.name} /> : null}
              {selectedTier ? (
                <Detail
                  label="Amount"
                  mono
                  value={
                    (totals.totalDueNowMinor > 0
                      ? formatMoney(totals.totalDueNowMinor, currency)
                      : formatMoney(selectedTier.priceMinor, currency)) +
                    (selectedTier.billingPeriod === "MONTHLY" ? " / month" : "")
                  }
                />
              ) : null}
            </dl>

            <p className="mt-5 text-[0.8125rem] leading-relaxed text-[var(--doc-fg-subtle)]">
              Keep this link. It stays available as your copy of what was agreed, and quoting the
              reference above identifies this exact version.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const canSubmit =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    consented &&
    (isExternal || method === "TYPED" || Boolean(drawn.dataUrl)) &&
    (!requireTitle || title.trim().length > 0) &&
    status !== "working";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("working");
    setError(null);

    const common = {
      token,
      signerName: name.trim(),
      signerEmail: email.trim(),
      signerTitle: title.trim(),
      selectedTierKey: selectedTierKey ?? null,
      selectedAddOnKeys: [...selectedAddOnKeys],
      consented: true as const,
    };

    try {
      const result = isExternal
        ? await approveExternalAction(common)
        : await (async () => {
            const imageDataUrl =
              method === "TYPED" ? renderTypedSignature(name) : drawn.dataUrl;
            if (!imageDataUrl) {
              return { ok: false as const, error: "Add your signature before continuing." };
            }
            return signProposalAction({
              ...common,
              method,
              imageDataUrl,
              strokeData: method === "DRAWN" ? { strokes: drawn.strokes } : undefined,
              consentText,
              consentVersion,
            });
          })();

      if (!result.ok) {
        setStatus("idle");
        setError(result.error);
        return;
      }
      // Reload rather than just flipping local state: the server can now render
      // the document as executed, with the signature and date filled in. Showing
      // a toast over an apparently unsigned document is unconvincing when
      // someone has just committed to a contract.
      setStatus("done");
      window.location.reload();
    } catch {
      setStatus("idle");
      setError("Something went wrong. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--doc-border-strong)] bg-[var(--doc-bg)] px-3.5 py-2.5 text-[0.9375rem] text-[var(--doc-fg)] outline-none transition-colors placeholder:text-[var(--doc-fg-subtle)] focus:border-[var(--doc-accent)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {selectedTier ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-[var(--doc-bg-inset)] px-4 py-3">
          <span className="text-[0.875rem] text-[var(--doc-fg-muted)]">
            You&rsquo;re accepting <strong className="text-[var(--doc-fg)]">{selectedTier.name}</strong>
          </span>
          <span className="money text-[0.9375rem] font-semibold text-[var(--doc-fg)]">
            {totals.totalDueNowMinor > 0
              ? formatMoney(totals.totalDueNowMinor, currency)
              : formatMoney(selectedTier.priceMinor, currency)}
            {selectedTier.billingPeriod === "MONTHLY" ? (
              <span className="font-normal text-[var(--doc-fg-subtle)]">/mo</span>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="signer-name" className="mb-1.5 block text-[0.8125rem] text-[var(--doc-fg-muted)]">
            Full name
          </label>
          <input
            id="signer-name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signer-email" className="mb-1.5 block text-[0.8125rem] text-[var(--doc-fg-muted)]">
            Email
          </label>
          <input
            id="signer-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {requireTitle || !isExternal ? (
        <div>
          <label htmlFor="signer-title" className="mb-1.5 block text-[0.8125rem] text-[var(--doc-fg-muted)]">
            Job title {requireTitle ? "" : <span className="text-[var(--doc-fg-subtle)]">(optional)</span>}
          </label>
          <input
            id="signer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>
      ) : null}

      {!isExternal ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.8125rem] text-[var(--doc-fg-muted)]">Signature</span>
            <div className="flex gap-1 rounded-lg bg-[var(--doc-bg-inset)] p-0.5">
              {(["DRAWN", "TYPED"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[0.8125rem] transition-colors",
                    method === m
                      ? "bg-[var(--doc-bg-elevated)] text-[var(--doc-fg)]"
                      : "text-[var(--doc-fg-subtle)]",
                  )}
                >
                  {m === "DRAWN" ? "Draw" : "Type"}
                </button>
              ))}
            </div>
          </div>

          {method === "DRAWN" ? (
            <SignaturePad onChange={setDrawn} disabled={status === "working"} />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--doc-border-strong)] bg-white px-6">
              <span
                className="truncate text-4xl text-black"
                style={{ fontFamily: '"Segoe Script", "Bradley Hand", "Snell Roundhand", cursive', fontStyle: "italic" }}
              >
                {name.trim() || <span className="text-black/25">Your name</span>}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--doc-accent)]"
        />
        <span className="text-[0.8125rem] leading-[1.6] text-[var(--doc-fg-muted)]">
          {isExternal
            ? "I confirm I'm authorised to approve this scope, pricing and timeline on behalf of my organisation."
            : consentText}
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-[0.875rem] text-[var(--doc-danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-xl px-5 py-3.5 text-[0.9375rem] font-medium text-white transition-opacity disabled:opacity-40 sm:w-auto sm:min-w-64"
        style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }}
      >
        {status === "working"
          ? "Submitting…"
          : isExternal
            ? externalCtaLabel
            : "Sign and accept"}
      </button>

      {!isExternal ? (
        <p className="text-[0.75rem] leading-relaxed text-[var(--doc-fg-subtle)]">
          Your name, email, IP address and the time of signing are recorded against the exact version
          of this document shown above.
        </p>
      ) : null}
    </form>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)]">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "money mt-1 text-[0.9375rem] font-medium text-[var(--doc-fg)]"
            : "mt-1 text-[0.9375rem] text-[var(--doc-fg)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
