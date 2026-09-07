import type { AddOn, PricingTier } from "@/lib/blocks/schemas";

/**
 * All proposal money maths. Pure functions, no I/O, unit tested.
 *
 * Every amount is an integer in MINOR units (cents, paise). Floats are never
 * used: 0.1 + 0.2 !== 0.3 is not an acceptable property for a number a client
 * is about to be charged.
 *
 * This is the only place totals are computed. Duplicating any of it into a
 * component is how a proposal ends up displaying one number and charging
 * another.
 */

/** Currencies whose minor unit is not 1/100. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW",
  "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function minorUnitExponent(currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(c)) return 3;
  return 2;
}

export function minorUnitFactor(currency: string): number {
  return 10 ** minorUnitExponent(currency);
}

/** Convert a human-entered major amount ("4999.50") to minor units. */
export function toMinorUnits(major: number | string, currency: string): number {
  let value: number;
  if (typeof major === "string") {
    // Strip currency symbols and thousands separators, but do NOT let a string
    // with no digits at all fall through: Number("") is 0, which would put a
    // silent zero on a client-facing proposal instead of failing.
    const cleaned = major.replace(/[^0-9.eE+-]/g, "");
    value = /\d/.test(cleaned) ? Number(cleaned) : Number.NaN;
  } else {
    value = major;
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot convert "${major}" to minor units: not a finite number.`);
  }
  // Round through a string to dodge binary floating-point drift, e.g.
  // 1.005 * 100 === 100.49999999999999 in IEEE 754.
  const exp = minorUnitExponent(currency);
  const scaled = Number(`${value}e${exp}`);
  return Math.round(scaled);
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  return amountMinor / minorUnitFactor(currency);
}

/** Locale-aware display. Falls back to a plain string if Intl lacks the code. */
export function formatMoney(
  amountMinor: number,
  currency: string,
  opts: { locale?: string; showDecimals?: boolean } = {},
): string {
  const { locale = "en-US" } = opts;
  const exp = minorUnitExponent(currency);
  const value = fromMinorUnits(amountMinor, currency);
  // Whole amounts read better without ".00" on a proposal.
  const showDecimals = opts.showDecimals ?? amountMinor % minorUnitFactor(currency) !== 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: showDecimals ? exp : 0,
      maximumFractionDigits: showDecimals ? exp : 0,
    }).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(showDecimals ? exp : 0)}`;
  }
}

// ─────────────────────────────────────────────────────────────────
// Totals
// ─────────────────────────────────────────────────────────────────

export interface SelectedAddOn {
  key: string;
  name: string;
  priceMinor: number;
  billingPeriod: "ONE_TIME" | "MONTHLY";
}

export interface TotalsInput {
  currency: string;
  tier?: Pick<PricingTier, "key" | "name" | "priceMinor" | "billingPeriod"> | null;
  addOns?: SelectedAddOn[];
  /** Basis points, so 18% GST is 1800. Avoids float percentages entirely. */
  taxRateBps?: number;
  /** Whole percent of the one-time total taken up front. */
  depositPercent?: number | null;
}

export interface Totals {
  currency: string;
  /** One-time charges: the selected tier (if one-time) plus one-time add-ons. */
  oneTimeSubtotalMinor: number;
  /** Recurring charges, normalised to a monthly figure. */
  recurringMonthlySubtotalMinor: number;
  taxMinor: number;
  /** One-time subtotal plus tax. This is what is actually collected now. */
  totalDueNowMinor: number;
  depositMinor: number;
  balanceMinor: number;
  lineItems: Array<{
    key: string;
    label: string;
    amountMinor: number;
    recurring: boolean;
  }>;
}

const PERIOD_MONTHS = { ONE_TIME: 0, MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 } as const;

export function computeTotals(input: TotalsInput): Totals {
  const { currency, tier, addOns = [], taxRateBps = 0, depositPercent = null } = input;

  const lineItems: Totals["lineItems"] = [];
  let oneTime = 0;
  let recurringMonthly = 0;

  if (tier) {
    const months = PERIOD_MONTHS[tier.billingPeriod];
    const recurring = months > 0;
    if (recurring) {
      // Normalise every recurring cadence to a monthly figure so quarterly and
      // annual tiers are comparable in one number.
      recurringMonthly += Math.round(tier.priceMinor / months);
    } else {
      oneTime += tier.priceMinor;
    }
    lineItems.push({
      key: `tier:${tier.key}`,
      label: tier.name,
      amountMinor: tier.priceMinor,
      recurring,
    });
  }

  for (const addOn of addOns) {
    const recurring = addOn.billingPeriod === "MONTHLY";
    if (recurring) recurringMonthly += addOn.priceMinor;
    else oneTime += addOn.priceMinor;
    lineItems.push({
      key: `addon:${addOn.key}`,
      label: addOn.name,
      amountMinor: addOn.priceMinor,
      recurring,
    });
  }

  const taxMinor = Math.round((oneTime * taxRateBps) / 10_000);
  const totalDueNow = oneTime + taxMinor;

  // Deposit is taken on the tax-inclusive amount so the remaining balance is
  // exactly what is left, with no rounding residue.
  const depositMinor =
    depositPercent != null && depositPercent > 0
      ? Math.round((totalDueNow * depositPercent) / 100)
      : 0;

  return {
    currency,
    oneTimeSubtotalMinor: oneTime,
    recurringMonthlySubtotalMinor: recurringMonthly,
    taxMinor,
    totalDueNowMinor: totalDueNow,
    depositMinor,
    balanceMinor: totalDueNow - depositMinor,
    lineItems,
  };
}

// ─────────────────────────────────────────────────────────────────
// Vendor infrastructure costs
// ─────────────────────────────────────────────────────────────────

export interface VendorCostRowLike {
  monthlyCostMinor: number;
  setupCostMinor: number;
  billedTo: "CLIENT" | "AGENCY" | "INCLUDED";
}

export interface VendorCostTotals {
  clientMonthlyMinor: number;
  clientSetupMinor: number;
  agencyMonthlyMinor: number;
  includedMonthlyMinor: number;
  /** What the client actually pays third parties each month. */
  clientAnnualisedMinor: number;
}

export function computeVendorCostTotals(rows: VendorCostRowLike[]): VendorCostTotals {
  const t: VendorCostTotals = {
    clientMonthlyMinor: 0,
    clientSetupMinor: 0,
    agencyMonthlyMinor: 0,
    includedMonthlyMinor: 0,
    clientAnnualisedMinor: 0,
  };

  for (const r of rows) {
    switch (r.billedTo) {
      case "CLIENT":
        t.clientMonthlyMinor += r.monthlyCostMinor;
        t.clientSetupMinor += r.setupCostMinor;
        break;
      case "AGENCY":
        t.agencyMonthlyMinor += r.monthlyCostMinor;
        break;
      case "INCLUDED":
        t.includedMonthlyMinor += r.monthlyCostMinor;
        break;
    }
  }

  t.clientAnnualisedMinor = t.clientMonthlyMinor * 12 + t.clientSetupMinor;
  return t;
}

// ─────────────────────────────────────────────────────────────────
// Publication gate
// ─────────────────────────────────────────────────────────────────

/**
 * AI-researched vendor pricing must be human-verified before a client sees it.
 * Model pricing knowledge drifts, and a wrong number in a cost table is a
 * credibility hit in front of someone about to pay you.
 */
export function findUnverifiedVendorRows(
  rows: Array<{ id: string; vendor: string; aiGenerated: boolean; verifiedAt: string | null }>,
): Array<{ id: string; vendor: string }> {
  return rows
    .filter((r) => r.aiGenerated && !r.verifiedAt)
    .map((r) => ({ id: r.id, vendor: r.vendor }));
}
