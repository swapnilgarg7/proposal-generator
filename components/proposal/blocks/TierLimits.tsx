import type { TierLimitsBlock } from "@/lib/blocks/schemas";
import { Section, SectionHeader } from "@/components/proposal/primitives";

/**
 * Free-tier vs paid-tier limits, vendor by vendor.
 *
 * The column that earns its place is `freeCaveat`: what actually breaks when
 * you hit the ceiling. "10k rows free" is marketing; "reads start failing at
 * 10k rows and there is no grace period" is what a client needs to plan around.
 */
export function TierLimits({ data }: { data: TierLimitsBlock }) {
  return (
    <Section id="tier-limits">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <div className="space-y-4">
        {data.rows.map((row) => (
          <div
            key={row.id}
            className="doc-avoid-break overflow-hidden rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)]"
          >
            <div className="border-b border-[var(--doc-border)] px-6 py-4">
              <h3 className="font-semibold tracking-[-0.01em] text-[var(--doc-fg)]">
                {row.vendor}
              </h3>
            </div>

            <div className="grid gap-px bg-[var(--doc-border)] sm:grid-cols-2">
              <div className="bg-[var(--doc-bg-elevated)] p-6">
                <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-success)]">
                  Free tier
                </p>
                <p className="text-[0.9375rem] font-medium leading-snug text-[var(--doc-fg)]">
                  {row.freeLimit}
                </p>
                {row.freeCaveat ? (
                  <p className="mt-3 text-[0.875rem] leading-[1.65] text-[var(--doc-fg-subtle)]">
                    <span className="font-medium text-[var(--doc-warning)]">Where it stops: </span>
                    {row.freeCaveat}
                  </p>
                ) : null}
              </div>

              <div className="bg-[var(--doc-bg-elevated)] p-6">
                <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-accent)]">
                  Paid tier
                </p>
                <p className="text-[0.9375rem] font-medium leading-snug text-[var(--doc-fg)]">
                  {row.paidLimit ?? "–"}
                </p>
                {row.paidPriceNote ? (
                  <p className="mt-2 font-mono text-[0.8125rem] tabular-nums text-[var(--doc-fg-muted)]">
                    {row.paidPriceNote}
                  </p>
                ) : null}
              </div>
            </div>

            {row.recommendation ? (
              <div className="border-t border-[var(--doc-border)] bg-[var(--doc-bg-inset)] px-6 py-4">
                <p className="text-[0.875rem] leading-[1.65] text-[var(--doc-fg-muted)]">
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)]">
                    Our call&nbsp;&middot;&nbsp;
                  </span>
                  {row.recommendation}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
