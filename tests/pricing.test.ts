import { describe, expect, it } from "vitest";
import {
  computeTotals,
  computeVendorCostTotals,
  findUnverifiedVendorRows,
  formatMoney,
  fromMinorUnits,
  minorUnitExponent,
  toMinorUnits,
} from "@/lib/pricing";

describe("minor units", () => {
  it("uses 2 decimals for USD and INR", () => {
    expect(minorUnitExponent("USD")).toBe(2);
    expect(minorUnitExponent("INR")).toBe(2);
  });

  it("uses 0 decimals for JPY and 3 for KWD", () => {
    expect(minorUnitExponent("JPY")).toBe(0);
    expect(minorUnitExponent("KWD")).toBe(3);
  });

  it("is case-insensitive", () => {
    expect(minorUnitExponent("jpy")).toBe(0);
  });

  it("converts major to minor without floating-point drift", () => {
    // The naive `1.005 * 100` is 100.49999999999999 in IEEE 754 and rounds to 100.
    expect(toMinorUnits(1.005, "USD")).toBe(101);
    expect(toMinorUnits(4999, "USD")).toBe(499_900);
    expect(toMinorUnits(0.1 + 0.2, "USD")).toBe(30);
  });

  it("strips currency formatting from string input", () => {
    expect(toMinorUnits("$4,999.00", "USD")).toBe(499_900);
  });

  it("rejects non-numeric input rather than silently producing zero", () => {
    // Number("") is 0, so a naive strip-then-parse would quietly put $0.00 on a
    // proposal. Every one of these must throw instead.
    for (const bad of ["not a price", "", "   ", "$", "TBD", "-", "."]) {
      expect(() => toMinorUnits(bad, "USD")).toThrow(/not a finite number/i);
    }
  });

  it("still accepts legitimately formatted strings", () => {
    expect(toMinorUnits("4,999", "USD")).toBe(499_900);
    expect(toMinorUnits("-250.50", "USD")).toBe(-25_050);
  });

  it("round-trips", () => {
    expect(fromMinorUnits(toMinorUnits(9999.99, "USD"), "USD")).toBe(9999.99);
  });
});

describe("formatMoney", () => {
  it("omits decimals for whole amounts", () => {
    expect(formatMoney(499_900, "USD")).toBe("$4,999");
  });

  it("shows decimals when there is a fractional part", () => {
    expect(formatMoney(499_950, "USD")).toBe("$4,999.50");
  });

  it("formats INR with the rupee symbol", () => {
    // 5,000,000 paise = Rs 50,000
    expect(formatMoney(50_000_00, "INR")).toBe("\u20B950,000");
  });

  it("uses Indian digit grouping under an en-IN locale", () => {
    // 100,000,000 paise = Rs 10,00,000 (ten lakh), grouped 2-2-3 not 3-3-3.
    expect(formatMoney(1_000_000_00, "INR", { locale: "en-IN" })).toBe("\u20B910,00,000");
  });

  it("falls back gracefully for a currency code Intl cannot parse", () => {
    // Intl accepts any well-formed 3-letter code, so only a malformed one
    // reaches the fallback path.
    expect(formatMoney(1000, "US")).toBe("US 10");
  });

  it("renders an unknown but well-formed code via Intl", () => {
    // Intl emits a non-breaking space here, which is correct and should not be
    // normalised away.
    expect(formatMoney(1000, "XYZ")).toBe("XYZ\u00A010");
  });
});

describe("computeTotals", () => {
  const buildTier = {
    key: "build",
    name: "Build",
    priceMinor: 499_900, // $4,999 — SorvexAI's published Build price
    billingPeriod: "ONE_TIME" as const,
  };

  const retainerTier = {
    key: "retainer",
    name: "Retainer",
    priceMinor: 999_900, // $9,999/mo
    billingPeriod: "MONTHLY" as const,
  };

  it("returns zeros with no selection", () => {
    const t = computeTotals({ currency: "USD" });
    expect(t.totalDueNowMinor).toBe(0);
    expect(t.lineItems).toHaveLength(0);
  });

  it("totals a one-time tier", () => {
    const t = computeTotals({ currency: "USD", tier: buildTier });
    expect(t.oneTimeSubtotalMinor).toBe(499_900);
    expect(t.recurringMonthlySubtotalMinor).toBe(0);
    expect(t.totalDueNowMinor).toBe(499_900);
  });

  it("keeps a recurring tier out of the amount due now", () => {
    const t = computeTotals({ currency: "USD", tier: retainerTier });
    expect(t.recurringMonthlySubtotalMinor).toBe(999_900);
    expect(t.oneTimeSubtotalMinor).toBe(0);
    // A monthly retainer is not collected as a lump sum at signature.
    expect(t.totalDueNowMinor).toBe(0);
  });

  it("normalises an annual tier to a monthly figure", () => {
    const t = computeTotals({
      currency: "USD",
      tier: { key: "annual", name: "Annual", priceMinor: 1_200_000, billingPeriod: "ANNUAL" },
    });
    expect(t.recurringMonthlySubtotalMinor).toBe(100_000);
  });

  it("adds one-time and monthly add-ons to the right buckets", () => {
    const t = computeTotals({
      currency: "USD",
      tier: buildTier,
      addOns: [
        { key: "docs", name: "Technical documentation", priceMinor: 75_000, billingPeriod: "ONE_TIME" },
        { key: "video", name: "Video walkthrough", priceMinor: 50_000, billingPeriod: "ONE_TIME" },
        { key: "support", name: "Priority support", priceMinor: 100_000, billingPeriod: "MONTHLY" },
      ],
    });
    expect(t.oneTimeSubtotalMinor).toBe(499_900 + 75_000 + 50_000);
    expect(t.recurringMonthlySubtotalMinor).toBe(100_000);
    expect(t.lineItems).toHaveLength(4);
  });

  it("applies tax in basis points to the one-time subtotal only", () => {
    const t = computeTotals({
      currency: "INR",
      tier: { key: "build", name: "Build", priceMinor: 100_000_00, billingPeriod: "ONE_TIME" },
      taxRateBps: 1800, // 18% GST
    });
    expect(t.taxMinor).toBe(18_000_00);
    expect(t.totalDueNowMinor).toBe(118_000_00);
  });

  it("computes a deposit on the tax-inclusive total, leaving no rounding residue", () => {
    const t = computeTotals({
      currency: "USD",
      tier: buildTier,
      taxRateBps: 1800,
      depositPercent: 50,
    });
    expect(t.depositMinor + t.balanceMinor).toBe(t.totalDueNowMinor);
  });

  it("leaves no residue for a deposit percentage that does not divide evenly", () => {
    const t = computeTotals({
      currency: "USD",
      tier: { key: "odd", name: "Odd", priceMinor: 333_333, billingPeriod: "ONE_TIME" },
      depositPercent: 33,
    });
    expect(t.depositMinor + t.balanceMinor).toBe(t.totalDueNowMinor);
    expect(Number.isInteger(t.depositMinor)).toBe(true);
  });

  it("treats a zero or null deposit as nothing due up front", () => {
    expect(computeTotals({ currency: "USD", tier: buildTier, depositPercent: null }).depositMinor).toBe(0);
    expect(computeTotals({ currency: "USD", tier: buildTier, depositPercent: 0 }).depositMinor).toBe(0);
  });

  it("never produces a fractional minor unit", () => {
    const t = computeTotals({
      currency: "USD",
      tier: { key: "q", name: "Quarterly", priceMinor: 100_000, billingPeriod: "QUARTERLY" },
      taxRateBps: 725,
      depositPercent: 37,
    });
    for (const v of [
      t.oneTimeSubtotalMinor,
      t.recurringMonthlySubtotalMinor,
      t.taxMinor,
      t.totalDueNowMinor,
      t.depositMinor,
      t.balanceMinor,
    ]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("computeVendorCostTotals", () => {
  it("separates what the client pays from what the agency absorbs", () => {
    const t = computeVendorCostTotals([
      { monthlyCostMinor: 2_000, setupCostMinor: 0, billedTo: "CLIENT" },     // OpenAI $20
      { monthlyCostMinor: 2_500, setupCostMinor: 0, billedTo: "CLIENT" },     // Supabase $25
      { monthlyCostMinor: 2_000, setupCostMinor: 0, billedTo: "AGENCY" },     // our tooling
      { monthlyCostMinor: 1_000, setupCostMinor: 5_000, billedTo: "INCLUDED" },
    ]);
    expect(t.clientMonthlyMinor).toBe(4_500);
    expect(t.agencyMonthlyMinor).toBe(2_000);
    expect(t.includedMonthlyMinor).toBe(1_000);
    // Setup costs on INCLUDED rows are not billed to the client.
    expect(t.clientSetupMinor).toBe(0);
    expect(t.clientAnnualisedMinor).toBe(4_500 * 12);
  });

  it("handles an empty table", () => {
    expect(computeVendorCostTotals([]).clientAnnualisedMinor).toBe(0);
  });
});

describe("findUnverifiedVendorRows", () => {
  it("flags AI-generated rows that have not been verified", () => {
    const unverified = findUnverifiedVendorRows([
      { id: "1", vendor: "OpenAI", aiGenerated: true, verifiedAt: null },
      { id: "2", vendor: "Supabase", aiGenerated: true, verifiedAt: "2026-09-01T00:00:00.000Z" },
      { id: "3", vendor: "Vercel", aiGenerated: false, verifiedAt: null },
    ]);
    expect(unverified).toEqual([{ id: "1", vendor: "OpenAI" }]);
  });

  it("passes a fully hand-entered table", () => {
    expect(
      findUnverifiedVendorRows([{ id: "1", vendor: "Twilio", aiGenerated: false, verifiedAt: null }]),
    ).toEqual([]);
  });
});
