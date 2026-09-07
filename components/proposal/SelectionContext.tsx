"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AddOn, PricingTier } from "@/lib/blocks/schemas";
import { computeTotals, type Totals } from "@/lib/pricing";

/**
 * Client-side selection state for the public proposal viewer: which tier is
 * chosen and which add-ons are ticked, plus the derived total.
 *
 * The total shown here is computed by lib/pricing.ts — the same function the
 * server uses when it freezes the amount at tier selection. There is deliberately
 * no second implementation: a viewer that displays one number while the server
 * charges another is the defining bug of this product category.
 *
 * When `interactive` is false (preview, print, PDF capture) the provider still
 * supplies totals but selection is inert.
 */

interface SelectionState {
  interactive: boolean;
  currency: string;
  selectedTierKey: string | null;
  selectedAddOnKeys: ReadonlySet<string>;
  tiers: PricingTier[];
  addOns: AddOn[];
  totals: Totals;
  selectTier: (key: string) => void;
  toggleAddOn: (key: string) => void;
  registerTiers: (tiers: PricingTier[]) => void;
  registerAddOns: (addOns: AddOn[]) => void;
}

const SelectionContext = createContext<SelectionState | null>(null);

export function SelectionProvider({
  children,
  currency,
  interactive = true,
  initialTierKey = null,
  initialTiers = [],
  initialAddOns = [],
  taxRateBps = 0,
  depositPercent = null,
}: {
  children: ReactNode;
  currency: string;
  interactive?: boolean;
  initialTierKey?: string | null;
  initialTiers?: PricingTier[];
  initialAddOns?: AddOn[];
  taxRateBps?: number;
  depositPercent?: number | null;
}) {
  const [tiers, setTiers] = useState<PricingTier[]>(initialTiers);
  const [addOns, setAddOns] = useState<AddOn[]>(initialAddOns);

  const [selectedTierKey, setSelectedTierKey] = useState<string | null>(() => {
    if (initialTierKey) return initialTierKey;
    const recommended = initialTiers.find((t) => t.isRecommended);
    return recommended?.key ?? initialTiers[0]?.key ?? null;
  });

  const [selectedAddOnKeys, setSelectedAddOnKeys] = useState<Set<string>>(
    () => new Set(initialAddOns.filter((a) => a.selectedByDefault).map((a) => a.key)),
  );

  const selectTier = useCallback(
    (key: string) => {
      if (!interactive) return;
      setSelectedTierKey(key);
    },
    [interactive],
  );

  const toggleAddOn = useCallback(
    (key: string) => {
      if (!interactive) return;
      setSelectedAddOnKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [interactive],
  );

  const registerTiers = useCallback((incoming: PricingTier[]) => {
    setTiers((prev) => (prev.length ? prev : incoming));
    setSelectedTierKey((prev) => {
      if (prev) return prev;
      return incoming.find((t) => t.isRecommended)?.key ?? incoming[0]?.key ?? null;
    });
  }, []);

  const registerAddOns = useCallback((incoming: AddOn[]) => {
    setAddOns((prev) => (prev.length ? prev : incoming));
    setSelectedAddOnKeys((prev) => {
      if (prev.size) return prev;
      return new Set(incoming.filter((a) => a.selectedByDefault).map((a) => a.key));
    });
  }, []);

  const totals = useMemo(() => {
    const tier = tiers.find((t) => t.key === selectedTierKey) ?? null;
    return computeTotals({
      currency,
      tier,
      addOns: addOns
        .filter((a) => selectedAddOnKeys.has(a.key))
        .map((a) => ({
          key: a.key,
          name: a.name,
          priceMinor: a.priceMinor,
          billingPeriod: a.billingPeriod,
        })),
      taxRateBps,
      depositPercent,
    });
  }, [currency, tiers, addOns, selectedTierKey, selectedAddOnKeys, taxRateBps, depositPercent]);

  const value = useMemo<SelectionState>(
    () => ({
      interactive,
      currency,
      selectedTierKey,
      selectedAddOnKeys,
      tiers,
      addOns,
      totals,
      selectTier,
      toggleAddOn,
      registerTiers,
      registerAddOns,
    }),
    [
      interactive,
      currency,
      selectedTierKey,
      selectedAddOnKeys,
      tiers,
      addOns,
      totals,
      selectTier,
      toggleAddOn,
      registerTiers,
      registerAddOns,
    ],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionState {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used inside a <SelectionProvider>.");
  }
  return ctx;
}
