import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { demoProposal } from "../lib/fixtures/demo-proposal";
import { computeContentHash } from "../lib/versioning/snapshot";
import { computeEventHash, generateShareToken } from "../lib/versioning/snapshot";

/**
 * Seeds the SorvexAI organisation, the reusable service catalogue, and one
 * complete demo proposal so there is something real to look at immediately.
 *
 * Idempotent: safe to re-run. Uses the DIRECT connection because seeding runs
 * from a developer machine, not from serverless.
 */

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const ORG_SLUG = "sorvexai";

async function main() {
  // ── Organisation ────────────────────────────────────────────────
  // Legal entity name, address and tax ID are deliberately left null: nothing
  // on record establishes them, and inventing them would put false details on
  // a contract. They are editable in /settings.
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      slug: ORG_SLUG,
      name: "SorvexAI",
      legalName: null,
      email: "swapnil@sorvexai.com",
      website: "https://sorvexai.com",
      bookingUrl: "https://cal.com/swapnil-sorvex/30min",
      logoPath: "/logo.png",
      primaryColor: "#8B5CF6",
      accentColor: "#EC4899",
      tertiaryColor: "#3B82F6",
      defaultCurrency: "USD",
      defaultTheme: "DARK",
      defaultValidityDays: 30,
      signatureBlockName: "Swapnil Garg",
      signatureBlockTitle: "Founder",
      defaultTerms:
        "This proposal is valid until the date shown on the cover. Pricing is held for that period.\n\n" +
        "You own all source code, documentation and configuration produced under this engagement " +
        "outright, on final payment. We retain no licence over your deliverables.\n\n" +
        "Third-party service costs are billed directly to you by those vendors and are not marked up.\n\n" +
        "Either party may terminate with 14 days written notice. On termination you pay for work " +
        "completed to that point and receive everything produced.",
    },
  });

  // ── Owner ───────────────────────────────────────────────────────
  // supabaseUserId is a placeholder until first login: Supabase issues the real
  // id at sign-up, and the auth callback links this row by email.
  await prisma.user.upsert({
    where: { email: "swapnil@sorvexai.com" },
    update: { organizationId: org.id },
    create: {
      supabaseUserId: "pending:swapnil@sorvexai.com",
      email: "swapnil@sorvexai.com",
      name: "Swapnil Garg",
      role: "OWNER",
      organizationId: org.id,
    },
  });

  // ── Service catalogue: reusable deliverables ────────────────────
  // Drawn from the real service lines on sorvexai.com, plus the handover
  // deliverables that get broken out as their own line items.
  const deliverables = [
    ["Agentic AI Deployment", "Agentic AI", "Autonomous agents that manage multi-step workflows and operate across your stack."],
    ["LLM & RAG Engineering", "LLM & RAG", "Retrieval-augmented pipelines grounded in your proprietary data, built to resist hallucination."],
    ["AI Strategy & Roadmap", "AI Strategy", "Prioritised use cases, build-vs-buy calls, ROI projections and a phased roadmap."],
    ["Governance & Compliance", "AI Governance", "Bias auditing, EU AI Act readiness, model explainability and responsible deployment."],
    ["MLOps & Model Delivery", "MLOps", "CI/CD, monitoring and retraining workflows that keep models accurate in production."],
    ["Technical documentation", "Handover", "Architecture, integrations, credentials, data flows, failure modes and recovery steps — written so a future engineer who has never met us can pick it up."],
    ["Recorded video overview", "Handover", "Chaptered screen-recorded walkthrough: daily operation, the admin layer, and a technical deep-dive. Doubles as onboarding material for future hires."],
    ["Live team training session", "Handover", "Live session against the real system, with your team's questions answered."],
    ["30-day supported handover", "Handover", "Production monitoring and fixes at no additional cost."],
    ["Weekly progress demos", "Process", "Working software demonstrated weekly, not status updates."],
    ["Full source code ownership", "Process", "You own everything outright. No lock-in."],
  ] as const;

  for (const [name, category, description] of deliverables) {
    const existing = await prisma.serviceCatalogItem.findFirst({
      where: { organizationId: org.id, kind: "DELIVERABLE", name },
    });
    if (!existing) {
      await prisma.serviceCatalogItem.create({
        data: { organizationId: org.id, kind: "DELIVERABLE", name, category, description },
      });
    }
  }

  // ── Service catalogue: vendor costs ─────────────────────────────
  // Hand-entered and marked verified, so they can be used in a client-facing
  // proposal immediately. Anything AI-researched later lands unverified and is
  // blocked from publication until a human confirms it.
  const vendors = [
    {
      name: "Anthropic", planName: "API, usage-based", vendorUrl: "https://www.anthropic.com/pricing",
      monthlyCostMinor: 4_500, billedTo: "CLIENT" as const,
      freeLimit: "No free tier", freeCaveat: "Usage-billed from the first token.",
      paidLimit: "Pay as you go", paidPriceNote: "Varies with volume and model",
      recommendation: "The dominant variable cost. Model choice and prompt caching move it more than anything else.",
    },
    {
      name: "Supabase", planName: "Pro", vendorUrl: "https://supabase.com/pricing",
      monthlyCostMinor: 2_500, billedTo: "CLIENT" as const,
      freeLimit: "500 MB database, 2 GB bandwidth, 50k MAU",
      freeCaveat: "Projects pause after 7 days of inactivity and there are no daily backups.",
      paidLimit: "8 GB database, 250 GB bandwidth, daily backups, no pausing",
      paidPriceNote: "$25/month",
      recommendation: "Start on Pro wherever the data matters. Not a tier to economise on.",
    },
    {
      name: "Resend", planName: "Pro", vendorUrl: "https://resend.com/pricing",
      monthlyCostMinor: 2_000, billedTo: "CLIENT" as const,
      freeLimit: "3,000 emails/month, 100/day",
      freeCaveat: "The 100/day cap is the real constraint — a sequence across a backlog hits it and silently queues.",
      paidLimit: "50,000 emails/month, no daily cap", paidPriceNote: "$20/month",
      recommendation: "Free tier is fine until follow-up sequencing is switched on.",
    },
    {
      name: "Vercel", planName: "Hobby", vendorUrl: "https://vercel.com/pricing",
      monthlyCostMinor: 0, billedTo: "CLIENT" as const,
      freeLimit: "100 GB bandwidth, 1M function invocations",
      freeCaveat: "Hobby is licensed for non-commercial use only.",
      paidLimit: "1 TB bandwidth, commercial use, team access", paidPriceNote: "$20/user/month",
      recommendation: "Move to Pro as soon as it is commercial or a second person needs access.",
    },
    {
      name: "Twilio", planName: "Pay as you go", vendorUrl: "https://www.twilio.com/pricing",
      monthlyCostMinor: 3_200, billedTo: "CLIENT" as const,
      freeLimit: "Trial credit only",
      freeCaveat: "Trial accounts prefix every message and only send to verified numbers. Unusable for real customers.",
      paidLimit: "No cap", paidPriceNote: "About $0.0079 per SMS segment",
      recommendation: "Paid from day one. There is no meaningful free path.",
    },
    {
      name: "OpenAI", planName: "API, usage-based", vendorUrl: "https://openai.com/api/pricing",
      monthlyCostMinor: 3_000, billedTo: "CLIENT" as const,
      freeLimit: "No free tier", freeCaveat: "Usage-billed from the first token.",
      paidLimit: "Pay as you go", paidPriceNote: "Varies with model",
      recommendation: "Used where a second provider is worth the redundancy.",
    },
    {
      name: "Sentry", planName: "Team", vendorUrl: "https://sentry.io/pricing",
      monthlyCostMinor: 2_600, billedTo: "AGENCY" as const,
      freeLimit: "5k errors/month, 1 user",
      freeCaveat: "Single user and short retention make it thin for production support.",
      paidLimit: "50k errors/month, unlimited users", paidPriceNote: "$26/month",
      recommendation: "On our account during the supported handover period.",
    },
  ];

  for (const v of vendors) {
    const existing = await prisma.serviceCatalogItem.findFirst({
      where: { organizationId: org.id, kind: "VENDOR_COST", name: v.name },
    });
    if (!existing) {
      await prisma.serviceCatalogItem.create({
        data: {
          organizationId: org.id,
          kind: "VENDOR_COST",
          name: v.name,
          category: "Infrastructure",
          currency: "USD",
          vendorUrl: v.vendorUrl,
          planName: v.planName,
          monthlyCostMinor: v.monthlyCostMinor,
          setupCostMinor: 0,
          billedTo: v.billedTo,
          freeLimit: v.freeLimit,
          freeCaveat: v.freeCaveat,
          paidLimit: v.paidLimit,
          paidPriceNote: v.paidPriceNote,
          recommendation: v.recommendation,
          aiGenerated: false,
          verifiedAt: new Date(),
        },
      });
    }
  }

  // ── Demo client, contact and proposal ───────────────────────────
  let client = await prisma.client.findFirst({
    where: { organizationId: org.id, company: demoProposal.client.company },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        organizationId: org.id,
        company: demoProposal.client.company,
        website: demoProposal.client.website,
        industry: "Hospital & Health Care",
        source: "seed",
      },
    });
  }

  let contact = await prisma.contact.findFirst({
    where: { clientId: client.id, email: demoProposal.client.contactEmail ?? "" },
  });
  if (!contact && demoProposal.client.contactEmail) {
    contact = await prisma.contact.create({
      data: {
        clientId: client.id,
        name: demoProposal.client.contactName ?? "",
        email: demoProposal.client.contactEmail,
        title: demoProposal.client.contactTitle,
        isPrimary: true,
      },
    });
  }

  const existingProposal = await prisma.proposal.findFirst({
    where: { organizationId: org.id, title: demoProposal.title },
  });

  if (existingProposal) {
    console.log(`✓ Demo proposal already seeded (${existingProposal.id})`);
  } else {
    const { token, tokenHash } = generateShareToken();

    const proposal = await prisma.proposal.create({
      data: {
        organizationId: org.id,
        clientId: client.id,
        contactId: contact?.id,
        title: demoProposal.title,
        status: "DRAFT",
        theme: "DARK",
        currency: "USD",
        validUntil: new Date(demoProposal.validUntil!),
        projectStartDate: new Date(demoProposal.projectStartDate!),
        paymentEnabled: true,
        paymentProvider: "STRIPE",
        paymentTiming: "DEPOSIT_BEFORE_SIGN",
        depositPercent: 50,
        agreementMode: "INLINE_ESIGN",
        publicTokenHash: tokenHash,
        blocks: {
          create: demoProposal.blocks.map((b) => ({
            type: b.type,
            order: b.order,
            visible: b.visible,
            schemaVersion: b.schemaVersion,
            data: b.data as object,
          })),
        },
      },
    });

    // Freeze v1 and publish it. The public page renders THIS, never live block
    // rows, so a proposal cannot be edited out from under a client mid-signature.
    const snapshot = { ...demoProposal, proposalId: proposal.id };
    const version = await prisma.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        versionNumber: 1,
        snapshot: snapshot as object,
        contentHash: computeContentHash(snapshot),
      },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { publishedVersionId: version.id, publishedAt: new Date() },
    });

    const at = new Date();
    await prisma.proposalEvent.create({
      data: {
        proposalId: proposal.id,
        type: "CREATED",
        at,
        eventHash: computeEventHash(null, { type: "CREATED", at: at.toISOString() }),
      },
    });

    console.log(`✓ Demo proposal seeded (${proposal.id})`);
    console.log(`  contentHash: ${version.contentHash}`);
    console.log(`  share link:  /p/${token}`);
    console.log(`  (the token is shown once — only its SHA-256 is stored)`);
  }

  const counts = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    catalogue: await prisma.serviceCatalogItem.count(),
    clients: await prisma.client.count(),
    proposals: await prisma.proposal.count(),
    blocks: await prisma.proposalBlock.count(),
    versions: await prisma.proposalVersion.count(),
  };
  console.log("\nSeeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
