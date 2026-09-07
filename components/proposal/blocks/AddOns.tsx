"use client";

import { useEffect } from "react";
import type { AddOnsBlock } from "@/lib/blocks/schemas";
import { formatMoney } from "@/lib/pricing";
import { useSelection } from "@/components/proposal/SelectionContext";
import { CheckIcon, Section, SectionHeader } from "@/components/proposal/primitives";
import { cn } from "@/lib/utils";

export function AddOns({ data, locale }: { data: AddOnsBlock; locale: string }) {
  const { currency, selectedAddOnKeys, toggleAddOn, registerAddOns, interactive } = useSelection();

  useEffect(() => {
    registerAddOns(data.addOns);
  }, [data.addOns, registerAddOns]);

  return (
    <Section id="add-ons">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />

      <ul className="space-y-3">
        {data.addOns.map((addOn) => {
          const checked = selectedAddOnKeys.has(addOn.key);
          const price = formatMoney(addOn.priceMinor, currency, { locale });
          const periodSuffix = addOn.billingPeriod === "MONTHLY" ? "/mo" : "";

          const inner = (
            <>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  checked
                    ? "border-transparent text-white"
                    : "border-[var(--doc-border-strong)] text-transparent",
                )}
                style={
                  checked
                    ? { background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" }
                    : undefined
                }
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug text-[var(--doc-fg)]">
                  {addOn.name}
                </span>
                {addOn.description ? (
                  <span className="mt-1 block text-[0.875rem] leading-[1.6] text-[var(--doc-fg-muted)]">
                    {addOn.description}
                  </span>
                ) : null}
              </span>

              <span className="money shrink-0 text-[0.9375rem] font-medium text-[var(--doc-fg)]">
                {price}
                <span className="text-[var(--doc-fg-subtle)]">{periodSuffix}</span>
              </span>
            </>
          );

          const className = cn(
            "doc-avoid-break flex w-full gap-4 rounded-2xl border p-5 text-left transition-colors sm:p-6",
            checked
              ? "border-[var(--doc-accent)] bg-[var(--doc-bg-elevated)]"
              : "border-[var(--doc-border)] bg-[var(--doc-bg-elevated)]",
          );

          return (
            <li key={addOn.key}>
              {interactive ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleAddOn(addOn.key)}
                  className={className}
                >
                  {inner}
                </button>
              ) : (
                <div className={className}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
