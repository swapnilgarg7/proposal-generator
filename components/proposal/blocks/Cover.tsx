import type { CoverBlock } from "@/lib/blocks/schemas";
import type { DocContext } from "@/components/proposal/types";
import { formatDate } from "@/components/proposal/types";

export function Cover({ data, ctx }: { data: CoverBlock; ctx: DocContext }) {
  const { organization, client, validUntil } = ctx.snapshot;
  const validUntilLabel = formatDate(validUntil, ctx.locale);

  return (
    <section
      data-section
      id="cover"
      className="relative isolate overflow-hidden border-b border-[var(--doc-border)]"
    >
      {/* Ambient brand wash. Renders as a flat tint in print, which is correct. */}
      <div
        aria-hidden
        data-print-hide
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28]"
        style={{
          background:
            "radial-gradient(60rem 32rem at 12% -10%, #8B5CF6 0%, transparent 60%), radial-gradient(48rem 28rem at 92% 8%, #EC4899 0%, transparent 62%)",
        }}
      />

      <div className="mx-auto w-full max-w-[68rem] px-6 py-20 sm:px-10 sm:py-28">
        <div className="mb-16 flex items-center justify-between gap-6">
          <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-[var(--doc-fg)]">
            {organization.name}
          </span>
          {data.showClientLogo && client.company ? (
            <span className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
              {client.company}
            </span>
          ) : null}
        </div>

        {data.eyebrow ? (
          <p className="mb-5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-[var(--doc-accent)]">
            {data.eyebrow}
          </p>
        ) : null}

        <h1 className="max-w-[22ch] text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--doc-fg)] sm:text-6xl">
          {data.title}
        </h1>

        {data.subtitle ? (
          <p className="mt-6 max-w-[44rem] text-pretty text-lg leading-[1.6] text-[var(--doc-fg-muted)]">
            {data.subtitle}
          </p>
        ) : null}

        <dl className="mt-16 grid grid-cols-1 gap-x-10 gap-y-8 border-t border-[var(--doc-border)] pt-10 sm:grid-cols-3">
          <div>
            <dt className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
              {data.preparedForLabel}
            </dt>
            <dd className="text-[0.9375rem] leading-relaxed text-[var(--doc-fg)]">
              <span className="font-medium">{client.company}</span>
              {client.contactName ? (
                <>
                  <br />
                  <span className="text-[var(--doc-fg-muted)]">
                    {client.contactName}
                    {client.contactTitle ? `, ${client.contactTitle}` : ""}
                  </span>
                </>
              ) : null}
            </dd>
          </div>

          <div>
            <dt className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
              {data.preparedByLabel}
            </dt>
            <dd className="text-[0.9375rem] leading-relaxed text-[var(--doc-fg)]">
              <span className="font-medium">{organization.legalName ?? organization.name}</span>
              <br />
              <span className="text-[var(--doc-fg-muted)]">{organization.email}</span>
            </dd>
          </div>

          {data.showValidity && validUntilLabel ? (
            <div>
              <dt className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
                Valid until
              </dt>
              <dd className="text-[0.9375rem] leading-relaxed text-[var(--doc-fg)]">
                {validUntilLabel}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
