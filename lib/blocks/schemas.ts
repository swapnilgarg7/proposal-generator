import { z } from "zod";

/**
 * Block content schemas — the single source of truth for what a proposal
 * document can contain.
 *
 * These validate `ProposalBlock.data` on write, validate AI output before it is
 * ever persisted, and type the renderer. The database stores JSONB and enforces
 * nothing; this file is the contract.
 *
 * Money is ALWAYS an integer in minor units (cents / paise) plus a currency
 * code on the proposal. Never a float, never a formatted string.
 */

// ─────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────

/** Tiptap document JSON. Stored as JSON rather than HTML, which removes the
 *  entire sanitisation problem from both the web viewer and the PDF path. */
export const richTextSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const amountMinorSchema = z
  .number()
  .int("Amounts must be whole minor units (cents/paise), never fractional.")
  .min(0, "Amounts cannot be negative.")
  .max(1_000_000_000_00, "Amount exceeds a plausible engagement value.");

export const billingTargetSchema = z.enum(["CLIENT", "AGENCY", "INCLUDED"]);

const nonEmpty = (max = 300) => z.string().trim().min(1).max(max);

// ─────────────────────────────────────────────────────────────────
// COVER
// ─────────────────────────────────────────────────────────────────

export const coverBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).optional(),
  title: nonEmpty(200),
  subtitle: z.string().trim().max(400).optional(),
  preparedForLabel: z.string().trim().max(120).default("Prepared for"),
  preparedByLabel: z.string().trim().max(120).default("Prepared by"),
  showValidity: z.boolean().default(true),
  showClientLogo: z.boolean().default(true),
});

// ─────────────────────────────────────────────────────────────────
// PROBLEM_STATEMENT
// Mirrors the client's situation back at them before any solution is
// proposed. Modelled on the numbered "problemPitch" structure that the
// legacy Make.com scenario produced (reference/legacy-make-scenario.json),
// but with the cost of each problem made explicit rather than implied.
// ─────────────────────────────────────────────────────────────────

export const problemSchema = z.object({
  id: z.string(),
  heading: nonEmpty(200),
  body: z.string().trim().min(1).max(4000),
  /** What this specific problem costs them today — hours, money, churn. */
  impact: z.string().trim().max(400).optional(),
  /** A verbatim quote from the discovery call. Nothing lands harder. */
  evidence: z.string().trim().max(600).optional(),
});

export const problemStatementBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Where you are now"),
  title: nonEmpty(200).default("The problems you're facing"),
  intro: z.string().trim().max(1500).optional(),
  problems: z.array(problemSchema).min(1).max(8),
  /** The closing "if nothing changes" paragraph. */
  costOfInaction: z.string().trim().max(2000).optional(),
});

// ─────────────────────────────────────────────────────────────────
// RICH_TEXT — also serves TEAM, FAQ, case studies, why-us
// ─────────────────────────────────────────────────────────────────

export const richTextBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).optional(),
  title: z.string().trim().max(200).optional(),
  body: richTextSchema,
});

// ─────────────────────────────────────────────────────────────────
// SCOPE_OF_WORK
// ─────────────────────────────────────────────────────────────────

export const deliverableSchema = z.object({
  id: z.string(),
  name: nonEmpty(200),
  description: z.string().trim().max(1500).optional(),
  /** How you both agree this is done. Prevents scope disputes later. */
  acceptanceCriteria: z.string().trim().max(1000).optional(),
});

export const scopePhaseSchema = z.object({
  id: z.string(),
  name: nonEmpty(200),
  summary: z.string().trim().max(1000).optional(),
  deliverables: z.array(deliverableSchema).min(1).max(20),
});

export const scopeOfWorkBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Scope of work"),
  title: nonEmpty(200).default("What we'll build"),
  intro: z.string().trim().max(1500).optional(),
  phases: z.array(scopePhaseSchema).min(1).max(12),
  /** Naming what you are NOT doing is what makes a scope defensible. */
  outOfScope: z.array(nonEmpty(300)).max(20).default([]),
  assumptions: z.array(nonEmpty(300)).max(20).default([]),
  clientResponsibilities: z.array(nonEmpty(300)).max(20).default([]),
});

// ─────────────────────────────────────────────────────────────────
// PRICING_TIERS
// ─────────────────────────────────────────────────────────────────

export const tierFeatureSchema = z.object({
  id: z.string(),
  label: nonEmpty(300),
  included: z.boolean().default(true),
  detail: z.string().trim().max(400).optional(),
});

export const pricingTierSchema = z.object({
  /** Stable key, frozen onto the Proposal when the client selects a tier. */
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, "Tier key must be lowercase kebab-case."),
  name: nonEmpty(80),
  summary: z.string().trim().max(500).optional(),
  priceMinor: amountMinorSchema,
  /** Shown instead of a number when price is bespoke, e.g. "Custom". */
  priceLabelOverride: z.string().trim().max(40).optional(),
  billingPeriod: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]).default("ONE_TIME"),
  isRecommended: z.boolean().default(false),
  badge: z.string().trim().max(40).optional(),
  ctaLabel: z.string().trim().max(60).default("Select"),
  features: z.array(tierFeatureSchema).min(1).max(30),
});

export const pricingTiersBlockSchema = z
  .object({
    eyebrow: z.string().trim().max(120).default("Investment"),
    title: nonEmpty(200).default("Choose your engagement"),
    intro: z.string().trim().max(1500).optional(),
    tiers: z.array(pricingTierSchema).min(1).max(4),
    /** When true, the client picks a tier and it drives the payable total. */
    selectable: z.boolean().default(true),
    footnote: z.string().trim().max(600).optional(),
  })
  .refine((b) => new Set(b.tiers.map((t) => t.key)).size === b.tiers.length, {
    message: "Tier keys must be unique within a block.",
    path: ["tiers"],
  })
  .refine((b) => b.tiers.filter((t) => t.isRecommended).length <= 1, {
    message: "At most one tier can be marked recommended.",
    path: ["tiers"],
  });

// ─────────────────────────────────────────────────────────────────
// ADD_ONS
// ─────────────────────────────────────────────────────────────────

export const addOnSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/, "Add-on key must be lowercase kebab-case."),
  name: nonEmpty(200),
  description: z.string().trim().max(1000).optional(),
  priceMinor: amountMinorSchema,
  billingPeriod: z.enum(["ONE_TIME", "MONTHLY"]).default("ONE_TIME"),
  /** Pre-ticked when the client opens the proposal. */
  selectedByDefault: z.boolean().default(false),
});

export const addOnsBlockSchema = z
  .object({
    eyebrow: z.string().trim().max(120).default("Optional"),
    title: nonEmpty(200).default("Add-ons"),
    intro: z.string().trim().max(1000).optional(),
    addOns: z.array(addOnSchema).min(1).max(20),
  })
  .refine((b) => new Set(b.addOns.map((a) => a.key)).size === b.addOns.length, {
    message: "Add-on keys must be unique within a block.",
    path: ["addOns"],
  });

// ─────────────────────────────────────────────────────────────────
// SERVICE_COSTS — the third-party infrastructure cost table
// ─────────────────────────────────────────────────────────────────

export const serviceCostRowSchema = z.object({
  id: z.string(),
  vendor: nonEmpty(120),
  purpose: z.string().trim().max(300).optional(),
  planName: z.string().trim().max(120).optional(),
  vendorUrl: z.string().url().optional().or(z.literal("")),
  monthlyCostMinor: amountMinorSchema.default(0),
  setupCostMinor: amountMinorSchema.default(0),
  billedTo: billingTargetSchema.default("CLIENT"),
  notes: z.string().trim().max(600).optional(),

  /**
   * Provenance. AI-researched rows arrive with aiGenerated=true and
   * verifiedAt=null, and publishing is blocked while any such row remains
   * unverified. Model pricing knowledge drifts, and a wrong number in a cost
   * table is a credibility hit in front of a paying client.
   */
  aiGenerated: z.boolean().default(false),
  verifiedAt: z.string().datetime().nullable().default(null),
});

export const serviceCostsBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Running costs"),
  title: nonEmpty(200).default("What the infrastructure actually costs"),
  intro: z.string().trim().max(1500).optional(),
  rows: z.array(serviceCostRowSchema).min(1).max(40),
  showTotals: z.boolean().default(true),
  footnote: z
    .string()
    .trim()
    .max(800)
    .optional(),
});

// ─────────────────────────────────────────────────────────────────
// TIER_LIMITS — free vs paid vendor limits
// ─────────────────────────────────────────────────────────────────

export const tierLimitRowSchema = z.object({
  id: z.string(),
  vendor: nonEmpty(120),
  vendorUrl: z.string().url().optional().or(z.literal("")),
  freeLimit: nonEmpty(300),
  /** The honest part: what actually breaks when you hit the free ceiling. */
  freeCaveat: z.string().trim().max(600).optional(),
  paidLimit: z.string().trim().max(300).optional(),
  paidPriceNote: z.string().trim().max(200).optional(),
  recommendation: z.string().trim().max(600).optional(),
  aiGenerated: z.boolean().default(false),
  verifiedAt: z.string().datetime().nullable().default(null),
});

export const tierLimitsBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Free vs paid"),
  title: nonEmpty(200).default("Where the free tiers stop"),
  intro: z.string().trim().max(1500).optional(),
  rows: z.array(tierLimitRowSchema).min(1).max(30),
});

// ─────────────────────────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────────────────────────

export const milestoneSchema = z.object({
  id: z.string(),
  name: nonEmpty(200),
  description: z.string().trim().max(1500).optional(),
  /** Days from project start. Absolute dates are derived at render time from
   *  Proposal.projectStartDate, so a slipped start shifts the whole plan. */
  startOffsetDays: z.number().int().min(0).max(3650),
  durationDays: z.number().int().min(1).max(1095),
  deliverables: z.array(nonEmpty(300)).max(20).default([]),
  isPaymentMilestone: z.boolean().default(false),
});

export const timelineBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Timeline"),
  title: nonEmpty(200).default("How this ships"),
  intro: z.string().trim().max(1500).optional(),
  milestones: z.array(milestoneSchema).min(1).max(20),
  showGantt: z.boolean().default(true),
  showAbsoluteDates: z.boolean().default(true),
});

// ─────────────────────────────────────────────────────────────────
// TERMS
// ─────────────────────────────────────────────────────────────────

export const termsBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Terms"),
  title: nonEmpty(200).default("Terms & conditions"),
  body: richTextSchema,
  paymentTerms: z.string().trim().max(1000).optional(),
  governingLaw: z.string().trim().max(300).optional(),
});

// ─────────────────────────────────────────────────────────────────
// BLUEPRINT_OFFER — the free AI blueprint sweetener
// ─────────────────────────────────────────────────────────────────

export const blueprintOfferBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Included at no cost"),
  title: nonEmpty(200).default("Your free AI opportunity blueprint"),
  body: z.string().trim().max(2000),
  bullets: z.array(nonEmpty(300)).max(10).default([]),
  /** Optional urgency, e.g. "Sign by 14 March and this is included." */
  condition: z.string().trim().max(400).optional(),
  valueLabel: z.string().trim().max(60).optional(),
});

// ─────────────────────────────────────────────────────────────────
// PAYMENT — rendered only when Proposal.paymentEnabled
// ─────────────────────────────────────────────────────────────────

export const paymentBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Payment"),
  title: nonEmpty(200).default("Securing your start date"),
  intro: z.string().trim().max(1500).optional(),
  /** Copy only. The authoritative policy lives on Proposal.paymentTiming so
   *  the document can never disagree with what is actually charged. */
  note: z.string().trim().max(800).optional(),
});

// ─────────────────────────────────────────────────────────────────
// SIGNATURE
// ─────────────────────────────────────────────────────────────────

export const signatureBlockSchema = z.object({
  eyebrow: z.string().trim().max(120).default("Acceptance"),
  title: nonEmpty(200).default("Accept this proposal"),
  intro: z.string().trim().max(1500).optional(),
  /** Verbatim consent text. Versioned, stored on the Signature, and reproduced
   *  on the certificate page. ESIGN requires affirmative consent to transact
   *  electronically plus disclosure of the right to a paper copy. */
  consentText: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .default(
      "By signing below I agree to transact electronically, and I intend this " +
        "electronic signature to be the legal equivalent of my handwritten " +
        "signature on this proposal. I understand I may request a paper copy " +
        "at no charge, and may withdraw consent to transact electronically by " +
        "contacting the sender before signing.",
    ),
  consentVersion: z.string().trim().min(1).max(20).default("1.0"),
  requireTitle: z.boolean().default(false),

  /**
   * Copy used when Proposal.agreementMode is EXTERNAL_UPWORK / EXTERNAL_OTHER.
   * In those modes the client approves the proposal here but the binding
   * contract is executed elsewhere, so the block renders a hand-off panel
   * instead of a signature pad. Nothing in this path claims an e-signature or
   * emits a certificate — saying otherwise would misrepresent what happened.
   */
  externalTitle: z.string().trim().max(200).default("Next steps"),
  externalBody: z
    .string()
    .trim()
    .max(2000)
    .default(
      "Approving this proposal confirms the scope, pricing and timeline above. " +
        "The contract itself will be sent and signed on Upwork, and work begins " +
        "once that contract is accepted.",
    ),
  externalCtaLabel: z.string().trim().max(60).default("Approve this scope"),
  externalLinkLabel: z.string().trim().max(60).default("Open the Upwork contract"),
});

// ─────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = [
  "COVER",
  "PROBLEM_STATEMENT",
  "RICH_TEXT",
  "SCOPE_OF_WORK",
  "PRICING_TIERS",
  "ADD_ONS",
  "SERVICE_COSTS",
  "TIER_LIMITS",
  "TIMELINE",
  "TERMS",
  "BLUEPRINT_OFFER",
  "PAYMENT",
  "SIGNATURE",
] as const;

export type BlockTypeName = (typeof BLOCK_TYPES)[number];

export const blockSchemas = {
  COVER: coverBlockSchema,
  PROBLEM_STATEMENT: problemStatementBlockSchema,
  RICH_TEXT: richTextBlockSchema,
  SCOPE_OF_WORK: scopeOfWorkBlockSchema,
  PRICING_TIERS: pricingTiersBlockSchema,
  ADD_ONS: addOnsBlockSchema,
  SERVICE_COSTS: serviceCostsBlockSchema,
  TIER_LIMITS: tierLimitsBlockSchema,
  TIMELINE: timelineBlockSchema,
  TERMS: termsBlockSchema,
  BLUEPRINT_OFFER: blueprintOfferBlockSchema,
  PAYMENT: paymentBlockSchema,
  SIGNATURE: signatureBlockSchema,
} as const satisfies Record<BlockTypeName, z.ZodType>;

/** Discriminated union of every block, used by the renderer and snapshots. */
export const proposalBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("COVER"), data: coverBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("PROBLEM_STATEMENT"), data: problemStatementBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("RICH_TEXT"), data: richTextBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("SCOPE_OF_WORK"), data: scopeOfWorkBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("PRICING_TIERS"), data: pricingTiersBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("ADD_ONS"), data: addOnsBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("SERVICE_COSTS"), data: serviceCostsBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("TIER_LIMITS"), data: tierLimitsBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("TIMELINE"), data: timelineBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("TERMS"), data: termsBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("BLUEPRINT_OFFER"), data: blueprintOfferBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("PAYMENT"), data: paymentBlockSchema }),
  z.object({ id: z.string(), order: z.number().int(), visible: z.boolean().default(true), schemaVersion: z.number().int().default(1), type: z.literal("SIGNATURE"), data: signatureBlockSchema }),
]);

export type ProposalBlockData = z.infer<typeof proposalBlockSchema>;
export type CoverBlock = z.infer<typeof coverBlockSchema>;
export type ProblemStatementBlock = z.infer<typeof problemStatementBlockSchema>;
export type ScopeOfWorkBlock = z.infer<typeof scopeOfWorkBlockSchema>;
export type PricingTiersBlock = z.infer<typeof pricingTiersBlockSchema>;
export type AddOnsBlock = z.infer<typeof addOnsBlockSchema>;
export type ServiceCostsBlock = z.infer<typeof serviceCostsBlockSchema>;
export type TierLimitsBlock = z.infer<typeof tierLimitsBlockSchema>;
export type TimelineBlock = z.infer<typeof timelineBlockSchema>;
export type PricingTier = z.infer<typeof pricingTierSchema>;
export type AddOn = z.infer<typeof addOnSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type ServiceCostRow = z.infer<typeof serviceCostRowSchema>;

/**
 * Validate a block payload against its type's schema.
 * Throws a readable error rather than letting malformed content reach a
 * client-facing document.
 */
export function parseBlockData(type: BlockTypeName, data: unknown) {
  const schema = blockSchemas[type];
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid ${type} block content:\n${issues}`);
  }
  return result.data;
}

export function safeParseBlockData(type: BlockTypeName, data: unknown) {
  return blockSchemas[type].safeParse(data);
}
