import type { TimelineBlock } from "@/lib/blocks/schemas";
import type { DocContext } from "@/components/proposal/types";
import { Pill, ScrollArea, Section, SectionHeader } from "@/components/proposal/primitives";

/**
 * Milestones as a real Gantt track.
 *
 * Offsets are stored in days from project start rather than absolute dates, so
 * a slipped start date shifts the whole plan coherently instead of leaving
 * stale dates scattered through the document.
 */
export function Timeline({ data, ctx }: { data: TimelineBlock; ctx: DocContext }) {
  const { projectStartDate } = ctx.snapshot;
  const start = projectStartDate ? new Date(projectStartDate) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;

  const totalDays = Math.max(
    ...data.milestones.map((m) => m.startOffsetDays + m.durationDays),
    1,
  );

  const fmt = new Intl.DateTimeFormat(ctx.locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const dateAt = (offsetDays: number) => {
    if (!validStart) return null;
    const d = new Date(validStart);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return fmt.format(d);
  };

  return (
    <Section id="timeline">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      {data.showGantt ? (
        <div className="doc-avoid-break mb-8 rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-8">
          <ScrollArea>
            <div className="space-y-3">
              {data.milestones.map((m, i) => {
                const left = (m.startOffsetDays / totalDays) * 100;
                const width = (m.durationDays / totalDays) * 100;
                // A short bar cannot hold its own label without truncating it to
                // uselessness, so the label moves outside instead. 22% is where
                // a typical milestone name stops fitting.
                const labelInside = width >= 30;
                const labelOnLeft = left > 55;

                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <span className="w-8 shrink-0 font-mono text-[0.6875rem] tabular-nums text-[var(--doc-fg-subtle)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="relative h-9 flex-1 rounded-lg bg-[var(--doc-bg-inset)]">
                      <div
                        className="absolute inset-y-0 flex items-center rounded-lg px-3"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 3)}%`,
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #EC4899 55%, #3B82F6 100%)",
                        }}
                      >
                        {labelInside ? (
                          <span className="truncate text-[0.8125rem] font-medium text-white">
                            {m.name}
                          </span>
                        ) : (
                          <span
                            className={`pointer-events-none absolute whitespace-nowrap text-[0.8125rem] font-medium text-[var(--doc-fg)] ${
                              labelOnLeft ? "right-[calc(100%+0.625rem)]" : "left-[calc(100%+0.625rem)]"
                            }`}
                          >
                            {m.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-24 shrink-0 text-right font-mono text-[0.6875rem] tabular-nums text-[var(--doc-fg-subtle)]">
                      {m.durationDays}d
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <p className="mt-6 border-t border-[var(--doc-border)] pt-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)]">
            {totalDays} days end to end
            {validStart && data.showAbsoluteDates
              ? ` · ${dateAt(0)} → ${dateAt(totalDays)}`
              : ""}
          </p>
        </div>
      ) : null}

      <ol className="space-y-4">
        {data.milestones.map((m, i) => (
          <li
            key={m.id}
            className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-7"
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--doc-accent)]">
                Milestone {String(i + 1).padStart(2, "0")}
              </span>
              {validStart && data.showAbsoluteDates ? (
                <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--doc-fg-subtle)]">
                  {dateAt(m.startOffsetDays)} → {dateAt(m.startOffsetDays + m.durationDays)}
                </span>
              ) : (
                <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--doc-fg-subtle)]">
                  Day {m.startOffsetDays + 1}–{m.startOffsetDays + m.durationDays}
                </span>
              )}
              {m.isPaymentMilestone ? <Pill tone="accent">Payment due</Pill> : null}
            </div>

            <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--doc-fg)]">
              {m.name}
            </h3>

            {m.description ? (
              <p className="mt-2 text-[0.9375rem] leading-[1.7] text-[var(--doc-fg-muted)]">
                {m.description}
              </p>
            ) : null}

            {m.deliverables.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {m.deliverables.map((d, j) => (
                  <li
                    key={j}
                    className="rounded-lg bg-[var(--doc-bg-inset)] px-3 py-1.5 text-[0.8125rem] text-[var(--doc-fg-muted)]"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}
