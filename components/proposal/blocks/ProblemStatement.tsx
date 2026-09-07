import type { ProblemStatementBlock } from "@/lib/blocks/schemas";
import { Section, SectionHeader } from "@/components/proposal/primitives";

/**
 * Mirrors the client's situation back at them before any solution appears.
 *
 * The structure is deliberate: a numbered heading, the narrative, then the
 * measurable cost of that specific problem. Naming what it costs is what turns
 * a description into an argument.
 */
export function ProblemStatement({ data }: { data: ProblemStatementBlock }) {
  return (
    <Section id="problem">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <ol className="space-y-px overflow-hidden rounded-2xl border border-[var(--doc-border)]">
        {data.problems.map((p, i) => (
          <li
            key={p.id}
            className="doc-avoid-break relative bg-[var(--doc-bg-elevated)] p-6 sm:p-8"
          >
            <div className="flex gap-5 sm:gap-7">
              <span
                aria-hidden
                className="mt-0.5 shrink-0 font-mono text-[1.375rem] font-medium leading-none text-[var(--doc-accent)] tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold leading-snug tracking-[-0.01em] text-[var(--doc-fg)] sm:text-xl">
                  {p.heading}
                </h3>

                <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)] sm:text-base">
                  {p.body}
                </p>

                {p.evidence ? (
                  <blockquote className="mt-5 border-l-2 border-[var(--doc-border-strong)] pl-4 text-[0.9375rem] italic leading-relaxed text-[var(--doc-fg-subtle)]">
                    &ldquo;{p.evidence}&rdquo;
                  </blockquote>
                ) : null}

                {p.impact ? (
                  <p className="mt-5 inline-flex items-baseline gap-2 rounded-lg bg-[var(--doc-bg-inset)] px-3.5 py-2">
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)]">
                      Costing you
                    </span>
                    <span className="text-[0.9375rem] font-medium text-[var(--doc-fg)]">
                      {p.impact}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {data.costOfInaction ? (
        <div
          className="doc-avoid-break mt-8 rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: "color-mix(in srgb, var(--doc-danger) 35%, transparent)",
            background: "color-mix(in srgb, var(--doc-danger) 6%, var(--doc-bg-elevated))",
          }}
        >
          <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-danger)]">
            If nothing changes
          </p>
          <p className="whitespace-pre-line text-[0.9375rem] leading-[1.75] text-[var(--doc-fg)] sm:text-base">
            {data.costOfInaction}
          </p>
        </div>
      ) : null}
    </Section>
  );
}
