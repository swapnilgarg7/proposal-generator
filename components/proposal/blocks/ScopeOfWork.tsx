import type { ScopeOfWorkBlock } from "@/lib/blocks/schemas";
import { CheckIcon, DashIcon, Section, SectionHeader } from "@/components/proposal/primitives";

export function ScopeOfWork({ data }: { data: ScopeOfWorkBlock }) {
  return (
    <Section id="scope">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <div className="space-y-6">
        {data.phases.map((phase, i) => (
          <div
            key={phase.id}
            className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-8"
          >
            <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-[var(--doc-border)] pb-5">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--doc-accent)]">
                Phase {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-xl font-semibold tracking-[-0.015em] text-[var(--doc-fg)]">
                {phase.name}
              </h3>
            </div>

            {phase.summary ? (
              <p className="mb-6 text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)]">
                {phase.summary}
              </p>
            ) : null}

            <ul className="space-y-5">
              {phase.deliverables.map((d) => (
                <li key={d.id} className="doc-avoid-break flex gap-3.5">
                  <CheckIcon className="mt-1 text-[var(--doc-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-[var(--doc-fg)]">{d.name}</p>
                    {d.description ? (
                      <p className="mt-1.5 text-[0.9375rem] leading-[1.7] text-[var(--doc-fg-muted)]">
                        {d.description}
                      </p>
                    ) : null}
                    {d.acceptanceCriteria ? (
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--doc-fg-subtle)]">
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em]">
                          Done when&nbsp;
                        </span>
                        {d.acceptanceCriteria}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {(data.outOfScope.length > 0 ||
        data.assumptions.length > 0 ||
        data.clientResponsibilities.length > 0) && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {data.outOfScope.length > 0 ? (
            <ListPanel
              title="Not included"
              hint="Naming this up front is what keeps scope honest on both sides."
              items={data.outOfScope}
              muted
            />
          ) : null}
          {data.clientResponsibilities.length > 0 ? (
            <ListPanel title="What we'll need from you" items={data.clientResponsibilities} />
          ) : null}
          {data.assumptions.length > 0 ? (
            <ListPanel title="Assumptions" items={data.assumptions} />
          ) : null}
        </div>
      )}
    </Section>
  );
}

function ListPanel({
  title,
  items,
  hint,
  muted = false,
}: {
  title: string;
  items: string[];
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-inset)] p-6">
      <h4 className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
        {title}
      </h4>
      {hint ? (
        <p className="mb-4 text-[0.8125rem] leading-relaxed text-[var(--doc-fg-subtle)]">{hint}</p>
      ) : (
        <div className="mb-4" />
      )}
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-[1.6]">
            <DashIcon
              className={
                muted ? "mt-0.5 text-[var(--doc-fg-subtle)]" : "mt-0.5 text-[var(--doc-accent)]"
              }
            />
            <span className={muted ? "text-[var(--doc-fg-subtle)]" : "text-[var(--doc-fg-muted)]"}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
