import type { ComparisonTableBlock } from "@/lib/blocks/schemas";
import {
  CheckIcon,
  DashIcon,
  ScrollArea,
  Section,
  SectionHeader,
} from "@/components/proposal/primitives";
import { cn } from "@/lib/utils";

/**
 * A generic n-column comparison matrix.
 *
 * The structured blocks each answer one question well — SERVICE_COSTS for
 * vendor spend, TIER_LIMITS for free-vs-paid, PRICING_TIERS for packages. This
 * one exists for the tables that are pure reasoning: "here is what 1 account
 * versus 5 accounts actually costs you". Those are the tables that earn the
 * price, and before this block they had nowhere to live: RichText deliberately
 * has no table node, so a Tiptap table would have been dropped on the floor
 * with no visible error.
 *
 * Cells are plain strings rather than rich text. A comparison cell that needs
 * a paragraph is a sign the content belongs in prose, not a grid.
 */

/** Cells reading exactly yes/no become icons, so a feature matrix scans. */
function Cell({ value }: { value: string }) {
  const norm = value.trim().toLowerCase();
  if (norm === "yes") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--doc-success)]">
        <CheckIcon />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (norm === "no") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--doc-fg-subtle)]">
        <DashIcon />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <>{value}</>;
}

export function ComparisonTable({ data }: { data: ComparisonTableBlock }) {
  return (
    <Section id="comparison">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <ScrollArea>
        <div className="doc-avoid-break overflow-hidden rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--doc-border-strong)]">
                <th
                  scope="col"
                  className="px-5 py-4 align-bottom font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]"
                >
                  {data.rowHeaderLabel ?? ""}
                </th>
                {data.columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={cn(
                      "px-5 py-4 align-bottom",
                      col.emphasis && "bg-[var(--doc-accent)]/[0.07]",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[0.9375rem] font-semibold tracking-[-0.01em]",
                        col.emphasis ? "text-[var(--doc-accent)]" : "text-[var(--doc-fg)]",
                      )}
                    >
                      {col.label}
                    </span>
                    {col.note ? (
                      <span className="mt-1 block text-[0.75rem] font-normal leading-snug text-[var(--doc-fg-subtle)]">
                        {col.note}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[var(--doc-border)] last:border-b-0",
                    row.emphasis && "bg-[var(--doc-bg-inset)]",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "px-5 py-3.5 text-[0.875rem] font-medium leading-snug",
                      row.emphasis ? "text-[var(--doc-fg)]" : "text-[var(--doc-fg-muted)]",
                    )}
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => {
                    const col = data.columns[i];
                    return (
                      <td
                        key={col?.id ?? i}
                        className={cn(
                          "px-5 py-3.5 text-[0.875rem] leading-snug tabular-nums",
                          col?.emphasis && "bg-[var(--doc-accent)]/[0.07]",
                          row.emphasis
                            ? "font-semibold text-[var(--doc-fg)]"
                            : "text-[var(--doc-fg-muted)]",
                        )}
                      >
                        <Cell value={cell} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {data.footnote ? (
        <p className="mt-5 max-w-[46rem] text-[0.875rem] leading-[1.65] text-[var(--doc-fg-subtle)]">
          {data.footnote}
        </p>
      ) : null}
    </Section>
  );
}
