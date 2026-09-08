"use client";

import { useState, useTransition } from "react";
import {
  issueShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(app)/proposals/[id]/actions";

/**
 * Share-link control for a proposal.
 *
 * The awkward part of this UI is unavoidable and is the point: only a SHA-256
 * of the token is stored, so an existing link can never be shown again. The
 * panel therefore has to distinguish "a link is active" (which we know) from
 * "here is the link" (which we cannot know), and make replacing one an
 * explicit, warned action rather than a convenient way to "see" it — because
 * replacing takes the URL already sitting in a client's inbox dead.
 */
export function ShareLinkPanel({
  proposalId,
  hasLink,
  isRevoked,
  isPublished,
}: {
  proposalId: string;
  hasLink: boolean;
  isRevoked: boolean;
  isPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [minted, setMinted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  const issue = () => {
    setError(null);
    startTransition(async () => {
      const res = await issueShareLinkAction(proposalId);
      if (res.ok) {
        setMinted(res.url);
        setConfirmingReplace(false);
      } else {
        setError(res.error);
      }
    });
  };

  const revoke = () => {
    setError(null);
    startTransition(async () => {
      const res = await revokeShareLinkAction(proposalId);
      if (!res.ok) setError(res.error ?? "Could not revoke the link.");
      else setMinted(null);
    });
  };

  const copy = async () => {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some contexts; the URL is selectable anyway.
      setError("Could not copy. Select the link and copy it manually.");
    }
  };

  return (
    <section className="rounded-xl border border-white/[0.08] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-white/70">Client link</h2>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/35">
          {isRevoked ? "Revoked" : hasLink ? "Active" : "Not created"}
        </span>
      </div>

      {!isPublished ? (
        <p className="mt-3 text-sm text-amber-300/80">
          This proposal has no published version yet, so a link would have nothing to show.
        </p>
      ) : null}

      {minted ? (
        <div className="mt-4">
          <p className="text-sm text-emerald-300">
            Link ready. This is the only time it will be shown.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-white/[0.12] bg-black/30 px-3 py-2 font-mono text-[0.8125rem] text-white/85">
              {minted}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg border border-white/[0.15] px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[0.8125rem] text-white/40">
            Only a SHA-256 of the token is stored. Save it now — reopening this page will not
            bring it back.
          </p>
        </div>
      ) : hasLink && !isRevoked ? (
        <p className="mt-3 text-sm text-white/50">
          A link is active, but it cannot be displayed again: only its hash is stored. Replace it
          below if you no longer have the URL.
        </p>
      ) : (
        <p className="mt-3 text-sm text-white/50">
          {isRevoked
            ? "The previous link was revoked and no longer opens. Issue a new one to share this again."
            : "No client link has been created for this proposal yet."}
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!hasLink || isRevoked ? (
          <button
            type="button"
            onClick={issue}
            disabled={pending}
            className="rounded-lg bg-white/[0.1] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.16] disabled:opacity-50"
          >
            {pending ? "Working…" : "Create client link"}
          </button>
        ) : confirmingReplace ? (
          <>
            <button
              type="button"
              onClick={issue}
              disabled={pending}
              className="rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-50"
            >
              {pending ? "Working…" : "Yes, replace it"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReplace(false)}
              className="rounded-lg border border-white/[0.15] px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <p className="w-full text-[0.8125rem] text-amber-300/80">
              The link you have already sent stops working immediately.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmingReplace(true)}
              className="rounded-lg border border-white/[0.15] px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              Replace link
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={pending}
              className="rounded-lg border border-white/[0.15] px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
            >
              Revoke
            </button>
          </>
        )}
      </div>
    </section>
  );
}
