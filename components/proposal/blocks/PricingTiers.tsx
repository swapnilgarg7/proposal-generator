"use client";

import { useEffect } from "react";
import type { PricingTiersBlock } from "@/lib/blocks/schemas";
import { formatMoney } from "@/lib/pricing";
import { useSelection } from "@/components/proposal/SelectionContext";
import { CheckIcon, DashIcon, Section, SectionHeader } from "@/components/proposal/primitives";
import { cn } from "@/lib/utils";

const PERIOD_LABEL = {
  ONE_TIME: "one-time",
  MONTHLY: "per month",
  QUARTERLY: "per quarter",
  ANNUAL: "per year",
} as const;

export function PricingTiers({ data, locale }: { data: PricingTiersBlock; locale: string }) {
  const { currency, selectedTierKey, selectTier, registerTiers, interactive } = useSelection();

  // The block owns the tier definitions; the provider owns selection. Register
  // on mount so totals elsewhere in the document stay in sync.
  useEffect(() => {
    registerTiers(data.tiers);
  }, [data.tiers, registerTiers]);

  const selectable = data.selectable && interactive;

  return (
    <Section id="pricing">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <div
        className={cn(
          "grid gap-5",
          data.tiers.length === 1 && "max-w-md",
          data.tiers.length === 2 && "sm:grid-cols-2",
          data.tiers.length === 3 && "lg:grid-cols-3",
          data.tiers.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {data.tiers.map((tier) => {
          const isSelected = selectedTierKey === tier.key;
          const priceLabel =
            tier.priceLabelOverride ??
            formatMoney(tier.priceMinor, currency, { locale });

          return (
            <div
              key={tier.key}
              data-selected={isSelected || undefined}
              className={cn(
                "doc-avoid-break relative flex flex-col rounded-2xl border p-6 transition-colors sm:p-7",
                isSelected
                  ? "border-[var(--doc-accent)] bg-[var(--doc-bg-elevated)]"
                  : "border-[var(--doc-border)] bg-[var(--doc-bg-elevated)]",
              )}
            >
              {tier.isRecommended || tier.badge ? (
                <div
                  className="absolute -top-2.5 left-6 rounded-full px-2.5 py-1 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                  }}
                >
                  {tier.badge ?? "Recommended"}
                </div>
              ) : null}

              <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--doc-fg)]">
                {tier.name}
              </h3>

              {tier.summary ? (
                <p className="mt-2 min-h-[2.75rem] text-[0.875rem] leading-[1.6] text-[var(--doc-fg-muted)]">
                  {tier.summary}
                </p>
              ) : null}

              <div className="mt-5 flex items-baseline gap-1.5 border-b border-[var(--doc-border)] pb-5">
                <span className="money text-[2rem] font-semibold leading-none tracking-[-0.02em] text-[var(--doc-fg)]">
                  {priceLabel}
                </span>
                <span className="text-[0.8125rem] text-[var(--doc-fg-subtle)]">
                  {PERIOD_LABEL[tier.billingPeriod]}
                </span>
              </div>

              <ul className="mt-5 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li
                    key={f.id}
                    className={cn(
                      "flex gap-2.5 text-[0.875rem] leading-[1.55]",
                      f.included ? "text-[var(--doc-fg-muted)]" : "text-[var(--doc-fg-subtle)]",
                    )}
                  >
                    {f.included ? (
                      <CheckIcon className="mt-0.5 text-[var(--doc-accent)]" />
                    ) : (
                      <DashIcon className="mt-0.5 opacity-50" />
                    )}
                    <span className={cn(!f.included && "line-through decoration-1")}>
                      {f.label}
                      {f.detail ? (
                        <span className="mt-0.5 block text-[0.8125rem] text-[var(--doc-fg-subtle)] no-underline">
                          {f.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              {selectable ? (
                <button
                  type="button"
                  onClick={() => selectTier(tier.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    "mt-7 w-full rounded-xl px-4 py-3 text-[0.875rem] font-medium transition-opacity",
                    isSelected
                      ? "text-white"
                      : "border border-[var(--doc-border-strong)] text-[var(--doc-fg)] hover:opacity-80",
                  )}
                  style={
                    isSelected
                      ? { background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }
                      : undefined
                  }
                >
                  {isSelected ? "Selected" : tier.ctaLabel}
                </button>
              ) : isSelected ? (
                <div className="mt-7 rounded-xl border border-[var(--doc-accent)] px-4 py-3 text-center text-[0.875rem] font-medium text-[var(--doc-accent)]">
                  Selected
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {data.footnote ? (
        <p className="mt-6 text-[0.875rem] leading-relaxed text-[var(--doc-fg-subtle)]">
          {data.footnote}
        </p>
      ) : null}
    </Section>
  );
}
