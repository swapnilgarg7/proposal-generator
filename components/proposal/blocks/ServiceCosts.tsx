import type { ServiceCostsBlock } from "@/lib/blocks/schemas";
import type { DocContext } from "@/components/proposal/types";
import { computeVendorCostTotals } from "@/lib/pricing";
import { formatMoney } from "@/lib/pricing";
import { Pill, ScrollArea, Section, SectionHeader } from "@/components/proposal/primitives";

const BILLED_TO_LABEL = {
  CLIENT: "You pay",
  AGENCY: "We absorb",
  INCLUDED: "Included",
} as const;

/**
 * The third-party infrastructure cost table.
 *
 * Showing a client exactly what the underlying vendors cost — and who pays for
 * each — is a trust move most agencies avoid. It only works if the numbers are
 * right, which is why AI-researched rows cannot be published unverified.
 */
export function ServiceCosts({ data, ctx }: { data: ServiceCostsBlock; ctx: DocContext }) {
  const { currency } = ctx.snapshot;
  const totals = computeVendorCostTotals(data.rows);
  const money = (n: number) => formatMoney(n, currency, { locale: ctx.locale });

  return (
    <Section id="service-costs">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <div className="doc-avoid-break overflow-hidden rounded-2xl border border-[var(--doc-border)]">
        <ScrollArea>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--doc-border)] bg-[var(--doc-bg-inset)]">
                <Th>Service</Th>
                <Th>Plan</Th>
                <Th align="right">Setup</Th>
                <Th align="right">Monthly</Th>
                <Th align="right">Billed to</Th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--doc-border)] last:border-b-0 bg-[var(--doc-bg-elevated)]"
                >
                  <Td>
                    <span className="font-medium text-[var(--doc-fg)]">{row.vendor}</span>
                    {row.purpose ? (
                      <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--doc-fg-subtle)]">
                        {row.purpose}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <span className="text-[var(--doc-fg-muted)]">{row.planName ?? "—"}</span>
                    {row.notes ? (
                      <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--doc-fg-subtle)]">
                        {row.notes}
                      </span>
                    ) : null}
                  </Td>
                  <Td align="right" mono>
                    {row.setupCostMinor > 0 ? money(row.setupCostMinor) : "—"}
                  </Td>
                  <Td align="right" mono>
                    {row.monthlyCostMinor > 0 ? money(row.monthlyCostMinor) : "Free"}
                  </Td>
                  <Td align="right">
                    <Pill tone={row.billedTo === "CLIENT" ? "neutral" : "success"}>
                      {BILLED_TO_LABEL[row.billedTo]}
                    </Pill>
                  </Td>
                </tr>
              ))}
            </tbody>

            {data.showTotals ? (
              <tfoot>
                <tr className="border-t-2 border-[var(--doc-border-strong)] bg-[var(--doc-bg-inset)]">
                  <Td colSpan={2}>
                    <span className="font-medium text-[var(--doc-fg)]">
                      Your third-party running costs
                    </span>
                  </Td>
                  <Td align="right" mono>
                    {totals.clientSetupMinor > 0 ? money(totals.clientSetupMinor) : "—"}
                  </Td>
                  <Td align="right" mono>
                    <span className="font-semibold text-[var(--doc-fg)]">
                      {money(totals.clientMonthlyMinor)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="money text-[0.75rem] text-[var(--doc-fg-subtle)]">
                      {money(totals.clientAnnualisedMinor)}/yr
                    </span>
                  </Td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </ScrollArea>
      </div>

      {totals.agencyMonthlyMinor > 0 || totals.includedMonthlyMinor > 0 ? (
        <p className="mt-4 text-[0.875rem] leading-relaxed text-[var(--doc-fg-subtle)]">
          A further {money(totals.agencyMonthlyMinor + totals.includedMonthlyMinor)}/month of tooling
          sits on our side and is not billed to you.
        </p>
      ) : null}

      {data.footnote ? (
        <p className="mt-4 text-[0.875rem] leading-relaxed text-[var(--doc-fg-subtle)]">
          {data.footnote}
        </p>
      ) : null}
    </Section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-5 py-3.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-5 py-4 align-top text-[0.9375rem] ${align === "right" ? "text-right" : "text-left"} ${
        mono ? "money text-[var(--doc-fg-muted)]" : ""
      }`}
    >
      {children}
    </td>
  );
}
