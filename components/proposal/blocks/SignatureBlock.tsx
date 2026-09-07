import type { z } from "zod";
import type { signatureBlockSchema } from "@/lib/blocks/schemas";
import type { DocContext } from "@/components/proposal/types";
import { Section, SectionHeader } from "@/components/proposal/primitives";

type SignatureBlockData = z.infer<typeof signatureBlockSchema>;

/**
 * Acceptance. Branches on Proposal.agreementMode:
 *
 *  - INLINE_ESIGN: the client signs here. Produces a Signature row, a sealed
 *    PDF and a certificate page.
 *  - EXTERNAL_UPWORK / EXTERNAL_OTHER: the client approves the scope here, but
 *    the binding contract is executed elsewhere. This path deliberately does
 *    NOT collect a signature, emit a certificate, or use the word "sign" —
 *    claiming an e-signature that did not happen would misrepresent the record.
 */
export function SignatureBlock({
  data,
  ctx,
  action,
}: {
  data: SignatureBlockData;
  ctx: DocContext;
  /** Interactive control supplied by the public viewer; omitted in print. */
  action?: React.ReactNode;
}) {
  const { agreementMode, externalAgreementUrl, externalAgreementNote, organization } = ctx.snapshot;
  const isExternal = agreementMode !== "INLINE_ESIGN";

  if (isExternal) {
    const providerName = agreementMode === "EXTERNAL_UPWORK" ? "Upwork" : "a separate agreement";

    return (
      <Section id="acceptance">
        <SectionHeader eyebrow={data.eyebrow} title={data.externalTitle} />

        <div className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-8">
          <p className="max-w-[46rem] text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)] sm:text-base">
            {data.externalBody}
          </p>

          {externalAgreementNote ? (
            <p className="mt-4 max-w-[46rem] whitespace-pre-line text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)]">
              {externalAgreementNote}
            </p>
          ) : null}

          <ol className="mt-7 space-y-3 border-t border-[var(--doc-border)] pt-6">
            {[
              "You approve the scope, pricing and timeline in this document.",
              `We send the contract through ${providerName}.`,
              "Work begins once that contract is accepted.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3.5 text-[0.9375rem] leading-[1.6]">
                <span className="mt-px font-mono text-[0.75rem] tabular-nums text-[var(--doc-accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[var(--doc-fg-muted)]">{step}</span>
              </li>
            ))}
          </ol>

          {externalAgreementUrl ? (
            <a
              href={externalAgreementUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-print-hide
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[var(--doc-border-strong)] px-5 py-3 text-[0.875rem] font-medium text-[var(--doc-fg)]"
            >
              {data.externalLinkLabel}
              <span aria-hidden>&rarr;</span>
            </a>
          ) : null}

          {action ? <div className="mt-7" data-print-hide>{action}</div> : null}

          <p className="mt-7 border-t border-[var(--doc-border)] pt-5 text-[0.8125rem] leading-relaxed text-[var(--doc-fg-subtle)]">
            Approving here records your agreement to this scope. It is not an electronic signature,
            and it does not by itself create a binding contract &mdash; that happens when the{" "}
            {providerName} contract is accepted.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section id="acceptance">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <div className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <SignatureSlot
            label="For the client"
            name={ctx.snapshot.client.contactName}
            org={ctx.snapshot.client.company}
            title={ctx.snapshot.client.contactTitle}
          />
          <SignatureSlot
            label="For the provider"
            name={organization.signatureBlockName}
            org={organization.legalName ?? organization.name}
            title={organization.signatureBlockTitle}
          />
        </div>

        {action ? (
          <div className="mt-8 border-t border-[var(--doc-border)] pt-7" data-print-hide>
            {action}
          </div>
        ) : null}

        <p className="mt-7 border-t border-[var(--doc-border)] pt-5 text-[0.8125rem] leading-[1.7] text-[var(--doc-fg-subtle)]">
          {data.consentText}
        </p>
      </div>
    </Section>
  );
}

function SignatureSlot({
  label,
  name,
  org,
  title,
}: {
  label: string;
  name: string | null;
  org: string | null;
  title: string | null;
}) {
  return (
    <div>
      <p className="mb-6 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
        {label}
      </p>
      <div className="h-16 border-b border-[var(--doc-border-strong)]" />
      <dl className="mt-3 space-y-1 text-[0.875rem]">
        <div className="flex gap-2">
          <dt className="text-[var(--doc-fg-subtle)]">Name</dt>
          <dd className="text-[var(--doc-fg)]">{name ?? "—"}</dd>
        </div>
        {title ? (
          <div className="flex gap-2">
            <dt className="text-[var(--doc-fg-subtle)]">Title</dt>
            <dd className="text-[var(--doc-fg-muted)]">{title}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="text-[var(--doc-fg-subtle)]">For</dt>
          <dd className="text-[var(--doc-fg-muted)]">{org ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-[var(--doc-fg-subtle)]">Date</dt>
          <dd className="text-[var(--doc-fg-muted)]">&nbsp;</dd>
        </div>
      </dl>
    </div>
  );
}
