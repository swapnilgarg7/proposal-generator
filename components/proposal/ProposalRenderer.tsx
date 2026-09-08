import type { ReactNode } from "react";
import type { ProposalSnapshot } from "@/lib/versioning/snapshot";
import type { DocContext } from "@/components/proposal/types";
import type {
  AddOn,
  AddOnsBlock,
  PricingTier,
  PricingTiersBlock,
} from "@/lib/blocks/schemas";

import { SelectionProvider } from "@/components/proposal/SelectionContext";
import { Cover } from "@/components/proposal/blocks/Cover";
import { ProblemStatement } from "@/components/proposal/blocks/ProblemStatement";
import { ScopeOfWork } from "@/components/proposal/blocks/ScopeOfWork";
import { ServiceCosts } from "@/components/proposal/blocks/ServiceCosts";
import { TierLimits } from "@/components/proposal/blocks/TierLimits";
import { ComparisonTable } from "@/components/proposal/blocks/ComparisonTable";
import { Timeline } from "@/components/proposal/blocks/Timeline";
import { PricingTiers } from "@/components/proposal/blocks/PricingTiers";
import { AddOns } from "@/components/proposal/blocks/AddOns";
import { SignatureBlock } from "@/components/proposal/blocks/SignatureBlock";
import {
  BlueprintOffer,
  PaymentSection,
  RichTextSection,
  Terms,
} from "@/components/proposal/blocks/Simple";
import { GradientRule } from "@/components/proposal/primitives";

/**
 * Renders a proposal snapshot.
 *
 * PURE FUNCTION OF A SNAPSHOT. It never reads the database, never fetches, and
 * has no notion of "current" state. That is what guarantees the web viewer, the
 * PDF and the email preview cannot drift apart: they all call this with the
 * same frozen object.
 *
 * `mode="print"` disables every interactive affordance and forces the light
 * document theme, because dark documents print badly and clients forward PDFs
 * into procurement.
 */
export function ProposalRenderer({
  snapshot,
  mode = "web",
  locale = "en-US",
  interactive = false,
  signatureAction,
  taxRateBps = 0,
}: {
  snapshot: ProposalSnapshot;
  mode?: "web" | "print";
  locale?: string;
  /** Enables tier/add-on selection. Always false in print. */
  interactive?: boolean;
  /** Sign / approve control injected by the public viewer. */
  signatureAction?: ReactNode;
  taxRateBps?: number;
}) {
  const printMode = mode === "print";
  const theme = printMode ? "LIGHT" : snapshot.theme;
  const isInteractive = interactive && !printMode;

  const ctx: DocContext = { snapshot, printMode, locale };

  const visibleBlocks = snapshot.blocks
    .filter((b) => b.visible)
    .slice()
    .sort((a, b) => a.order - b.order);

  // Seed the selection provider from the document itself so totals are correct
  // on first paint, with no flash of an empty summary.
  const tiers: PricingTier[] = visibleBlocks.flatMap((b) =>
    b.type === "PRICING_TIERS" ? (b.data as PricingTiersBlock).tiers : [],
  );
  const addOns: AddOn[] = visibleBlocks.flatMap((b) =>
    b.type === "ADD_ONS" ? (b.data as AddOnsBlock).addOns : [],
  );

  return (
    <SelectionProvider
      currency={snapshot.currency}
      interactive={isInteractive}
      initialTiers={tiers}
      initialAddOns={addOns}
      taxRateBps={taxRateBps}
      depositPercent={snapshot.depositPercent}
    >
      <article
        data-doc-theme={theme === "DARK" ? "dark" : "light"}
        data-print-mode={printMode ? "true" : undefined}
        className="min-h-screen bg-[var(--doc-bg)] text-[var(--doc-fg)]"
      >
        {visibleBlocks.map((block, i) => (
          <div key={block.id}>
            {i > 0 && block.type !== "COVER" ? (
              <GradientRule className="mx-auto max-w-[68rem]" />
            ) : null}
            {renderBlock(block, ctx, locale, signatureAction)}
          </div>
        ))}

        <DocumentFooter snapshot={snapshot} />
      </article>
    </SelectionProvider>
  );
}

function renderBlock(
  block: ProposalSnapshot["blocks"][number],
  ctx: DocContext,
  locale: string,
  signatureAction?: ReactNode,
): ReactNode {
  switch (block.type) {
    case "COVER":
      return <Cover data={block.data} ctx={ctx} />;
    case "PROBLEM_STATEMENT":
      return <ProblemStatement data={block.data} />;
    case "RICH_TEXT":
      return <RichTextSection data={block.data} />;
    case "SCOPE_OF_WORK":
      return <ScopeOfWork data={block.data} />;
    case "PRICING_TIERS":
      return <PricingTiers data={block.data} locale={locale} />;
    case "ADD_ONS":
      return <AddOns data={block.data} locale={locale} />;
    case "SERVICE_COSTS":
      return <ServiceCosts data={block.data} ctx={ctx} />;
    case "TIER_LIMITS":
      return <TierLimits data={block.data} />;
    case "COMPARISON_TABLE":
      return <ComparisonTable data={block.data} />;
    case "TIMELINE":
      return <Timeline data={block.data} ctx={ctx} />;
    case "TERMS":
      return <Terms data={block.data} ctx={ctx} />;
    case "BLUEPRINT_OFFER":
      return <BlueprintOffer data={block.data} />;
    case "PAYMENT":
      // Suppressed entirely when payments are off for this proposal, so the
      // toggle governs the document rather than just the checkout route.
      return ctx.snapshot.paymentEnabled ? <PaymentSection data={block.data} ctx={ctx} /> : null;
    case "SIGNATURE":
      return <SignatureBlock data={block.data} ctx={ctx} action={signatureAction} />;
    default: {
      // Exhaustiveness guard: adding a BlockType without a renderer is a
      // compile error, not a silently blank section in a client's document.
      const _exhaustive: never = block;
      void _exhaustive;
      return null;
    }
  }
}

function DocumentFooter({ snapshot }: { snapshot: ProposalSnapshot }) {
  const { organization } = snapshot;
  return (
    <footer className="border-t border-[var(--doc-border)] bg-[var(--doc-bg-inset)]">
      <div className="mx-auto flex w-full max-w-[68rem] flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="text-[0.9375rem] font-medium text-[var(--doc-fg)]">
            {organization.legalName ?? organization.name}
          </p>
          {organization.addressLines.length > 0 ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--doc-fg-subtle)]">
              {organization.addressLines.join(", ")}
            </p>
          ) : null}
          {organization.taxId ? (
            <p className="mt-0.5 font-mono text-[0.75rem] text-[var(--doc-fg-subtle)]">
              {organization.taxId}
            </p>
          ) : null}
        </div>

        <div className="text-[0.8125rem] text-[var(--doc-fg-subtle)] sm:text-right">
          <p>{organization.email}</p>
          {organization.website ? <p className="mt-0.5">{organization.website}</p> : null}
        </div>
      </div>
    </footer>
  );
}
