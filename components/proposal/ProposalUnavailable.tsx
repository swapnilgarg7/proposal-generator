const COPY: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "This link isn't valid",
    body: "Check that you copied the whole link. If it still doesn't work, ask the sender for a fresh one.",
  },
  revoked: {
    title: "This link has been withdrawn",
    body: "The sender has revoked access to this proposal. Get in touch with them for an up-to-date version.",
  },
  expired: {
    title: "This proposal has expired",
    body: "The validity period has passed. Ask the sender to re-issue it and the pricing will be refreshed.",
  },
  not_published: {
    title: "This proposal isn't ready yet",
    body: "It hasn't been published. The sender will let you know once it's ready to review.",
  },
  corrupt: {
    title: "We couldn't load this proposal",
    body: "Something is wrong on our side. The sender has been notified, so please contact them directly.",
  },
};

/**
 * Deliberately does not distinguish "no such token" from "wrong token", and
 * never reveals whether a proposal exists behind a bad link.
 */
export function ProposalUnavailable({ reason }: { reason: string }) {
  const copy = COPY[reason] ?? COPY.not_found;

  return (
    <main
      data-doc-theme="dark"
      className="flex min-h-screen items-center justify-center bg-[var(--doc-bg)] px-6"
    >
      <div className="w-full max-w-md text-center">
        <p className="mb-4 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-[var(--doc-accent)]">
          Sorvex Proposals
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--doc-fg)]">
          {copy.title}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--doc-fg-muted)]">
          {copy.body}
        </p>
      </div>
    </main>
  );
}
