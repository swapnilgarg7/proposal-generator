import type { ProposalSnapshot } from "@/lib/versioning/snapshot";
import { paragraphs } from "@/components/proposal/RichText";

/**
 * A complete, realistic proposal used for renderer development, visual
 * regression tests, and as the shape the AI generator must produce.
 *
 * The client is drawn from the real ICP in sorvex/leads/ — US healthcare and
 * clinic owners — so the copy is representative rather than lorem ipsum.
 */
export const demoProposal: ProposalSnapshot = {
  snapshotVersion: 1,
  proposalId: "demo",
  title: "AI Patient Intake & Follow-Up System",
  currency: "USD",
  theme: "DARK",
  validUntil: "2026-10-07T00:00:00.000Z",
  projectStartDate: "2026-09-22T00:00:00.000Z",

  paymentEnabled: true,
  paymentTiming: "DEPOSIT_BEFORE_SIGN",
  depositPercent: 50,

  agreementMode: "INLINE_ESIGN",
  externalAgreementUrl: null,
  externalAgreementNote: null,

  organization: {
    name: "SorvexAI",
    legalName: "SorvexAI",
    email: "swapnil@sorvexai.com",
    website: "sorvexai.com",
    logoPath: "/logo.png",
    primaryColor: "#8B5CF6",
    accentColor: "#EC4899",
    tertiaryColor: "#3B82F6",
    addressLines: [],
    taxId: null,
    governingLaw: null,
    signatureBlockName: "Swapnil Garg",
    signatureBlockTitle: "Founder",
  },

  client: {
    company: "Ascend Behavior Partners",
    website: "https://www.ascendbehavior.com",
    logoPath: null,
    contactName: "Jonathan Mueller",
    contactEmail: "jonathan@ascendbehavior.com",
    contactTitle: "Co-founder",
  },

  blocks: [
    {
      id: "cover",
      order: 0,
      visible: true,
      schemaVersion: 1,
      type: "COVER",
      data: {
        eyebrow: "Proposal",
        title: "AI Patient Intake & Follow-Up System",
        subtitle:
          "Cutting 14 hours a week of front-desk admin, and closing the gap where 30% of new enquiries currently go cold.",
        preparedForLabel: "Prepared for",
        preparedByLabel: "Prepared by",
        showValidity: true,
        showClientLogo: true,
      },
    },

    {
      id: "problem",
      order: 1,
      visible: true,
      schemaVersion: 1,
      type: "PROBLEM_STATEMENT",
      data: {
        eyebrow: "Where you are now",
        title: "What's actually costing you",
        intro:
          "Three things came out of our call. Each is fixable, and each is currently taking real money off the table.",
        problems: [
          {
            id: "p1",
            heading: "Intake runs on phone tag",
            body:
              "Every new patient enquiry lands as a voicemail or a form email, and a staff member works through them manually between other duties. Response time averages just over a day, and enquiries that arrive on a Friday routinely wait until Monday.\n\nThe work itself is not complicated. It is qualification, insurance verification and scheduling. But it is entirely serialised through one or two people, so it does not scale, and it stops completely when they are on leave.",
            impact: "~14 staff hours/week",
            evidence:
              "We know we lose people over the weekend. We just don't have anyone to answer on a Saturday.",
          },
          {
            id: "p2",
            heading: "A third of enquiries never get a second touch",
            body:
              "There is no structured follow-up. If someone does not reply to the first call or email, nothing further happens automatically. From your own numbers, roughly 30% of enquiries receive exactly one contact attempt and are then effectively abandoned.\n\nThat is not a lead generation problem. Those people already raised their hand.",
            impact: "≈30% of enquiries, single-touch only",
          },
          {
            id: "p3",
            heading: "Nobody can see where anyone is in the process",
            body:
              "Status lives across a spreadsheet, an inbox and individual memory. There is no single view of who has been contacted, who is waiting on insurance verification, and who is ready to book. That makes the bottleneck impossible to locate and impossible to staff against.",
            impact: "No single source of truth",
          },
        ],
        costOfInaction:
          "At your current enquiry volume and average patient value, the single-touch drop-off alone represents roughly $8,000–$12,000 in monthly revenue that never converts. That number grows with every marketing dollar you spend, because more enquiries into the same funnel means more of them going cold.",
      },
    },

    {
      id: "approach",
      order: 2,
      visible: true,
      schemaVersion: 1,
      type: "RICH_TEXT",
      data: {
        eyebrow: "How we'd fix it",
        title: "One intake pipeline, running whether or not anyone is at the desk",
        body: paragraphs(
          "We build a single automated intake pipeline. Every enquiry, from any channel, enters the same flow: acknowledged within a minute, qualified against your criteria, insurance checked where possible, and either booked or routed to a person with full context attached.",
          "Follow-up is sequenced rather than remembered. If someone does not respond, the system continues contacting them on a schedule you set, across email and SMS, until they book or explicitly opt out.",
          "Your team keeps every decision that should involve judgement. What they stop doing is the retrieval, the re-typing and the remembering.",
        ),
      },
    },

    {
      id: "scope",
      order: 3,
      visible: true,
      schemaVersion: 1,
      type: "SCOPE_OF_WORK",
      data: {
        eyebrow: "Scope of work",
        title: "What we'll build",
        intro:
          "Four phases. Each ends with something working that you can see and use, not a status update.",
        phases: [
          {
            id: "ph1",
            name: "Discovery & intake mapping",
            summary:
              "We map your current intake end to end, agree the qualification criteria, and define exactly what 'ready to book' means.",
            deliverables: [
              {
                id: "d1",
                name: "Current-state process map",
                description:
                  "Every route an enquiry can take today, with the handoffs and the drop-off points marked.",
                acceptanceCriteria: "You confirm the map matches how intake actually works.",
              },
              {
                id: "d2",
                name: "Qualification & routing rules",
                description:
                  "The written logic the system will apply: what qualifies, what escalates to a human, what gets declined and how.",
                acceptanceCriteria: "Rules signed off in writing by you and your clinical lead.",
              },
            ],
          },
          {
            id: "ph2",
            name: "Intake automation build",
            summary: "The core pipeline: capture, qualify, verify, schedule.",
            deliverables: [
              {
                id: "d3",
                name: "Unified enquiry capture",
                description:
                  "Web form, phone transcription and inbound email all normalised into one queue with a consistent shape.",
                acceptanceCriteria: "A test enquiry from each channel lands correctly in the queue.",
              },
              {
                id: "d4",
                name: "AI qualification & response drafting",
                description:
                  "An LLM applies your rules, drafts the first response in your clinic's voice, and attaches its reasoning for the reviewer.",
                acceptanceCriteria:
                  "50 historical enquiries replayed; qualification matches your team's decision in at least 9 of 10 cases.",
              },
              {
                id: "d5",
                name: "Scheduling integration",
                description: "Qualified patients book directly into live calendar availability.",
                acceptanceCriteria: "A booking made by the system appears correctly in your calendar.",
              },
            ],
          },
          {
            id: "ph3",
            name: "Follow-up sequencing & dashboard",
            summary: "Closing the single-touch gap, and making the pipeline visible.",
            deliverables: [
              {
                id: "d6",
                name: "Multi-touch follow-up sequences",
                description:
                  "Configurable email and SMS cadences with automatic stop-on-reply and opt-out handling.",
                acceptanceCriteria:
                  "A non-responding test contact receives the full sequence; a replying one stops immediately.",
              },
              {
                id: "d7",
                name: "Pipeline dashboard",
                description:
                  "Live view of every enquiry by stage, with time-in-stage so bottlenecks are visible rather than inferred.",
                acceptanceCriteria: "Dashboard reconciles against source data for a full test week.",
              },
            ],
          },
          {
            id: "ph4",
            name: "Handover & enablement",
            summary:
              "You own this outright at the end. That means it has to be documented and teachable, not just working.",
            deliverables: [
              {
                id: "d8",
                name: "Technical documentation",
                description:
                  "Full written documentation: system architecture, every integration and credential, the qualification rule set, data flows, failure modes and how to recover from each. Written so a future engineer who has never met us can pick it up.",
                acceptanceCriteria:
                  "Delivered as a versioned document you own, reviewed with you line by line.",
              },
              {
                id: "d9",
                name: "Recorded video overview",
                description:
                  "A structured screen-recorded walkthrough covering day-to-day operation for your staff, the admin and configuration layer, and a technical deep-dive on how the system is put together. Chaptered, so it doubles as onboarding material for anyone you hire later.",
                acceptanceCriteria: "Videos delivered as downloadable files you retain permanently.",
              },
              {
                id: "d10",
                name: "Team training session",
                description:
                  "Live session with your front-desk team on the new process, with their questions answered against the real system.",
                acceptanceCriteria: "Session delivered and recorded.",
              },
              {
                id: "d11",
                name: "30-day supported handover",
                description:
                  "We monitor the system in production and fix anything that surfaces, at no additional cost.",
                acceptanceCriteria: "30 days elapsed from go-live.",
              },
            ],
          },
        ],
        outOfScope: [
          "Changes to your EHR or practice management system itself",
          "Clinical decision-making of any kind",
          "Billing, claims submission or revenue cycle management",
          "Migration of historical patient records",
          "Ongoing content or marketing production",
        ],
        assumptions: [
          "Your scheduling system exposes an API or supports calendar integration",
          "Enquiry volume stays within roughly 2x current levels during the build",
          "One nominated decision-maker is available for weekly reviews",
        ],
        clientResponsibilities: [
          "Access to current intake channels and a test environment",
          "Sign-off on qualification rules before build begins",
          "A named clinical contact for escalation logic",
          "Accounts for the third-party services listed below",
        ],
      },
    },

    {
      id: "timeline",
      order: 4,
      visible: true,
      schemaVersion: 1,
      type: "TIMELINE",
      data: {
        eyebrow: "Timeline",
        title: "How this ships",
        intro:
          "Six weeks from kickoff to live, with something demonstrable at the end of every phase.",
        showGantt: true,
        showAbsoluteDates: true,
        milestones: [
          {
            id: "m1",
            name: "Discovery & rules sign-off",
            description:
              "Process mapped, qualification rules agreed in writing, integrations confirmed.",
            startOffsetDays: 0,
            durationDays: 7,
            deliverables: ["Process map", "Qualification rules"],
            isPaymentMilestone: false,
          },
          {
            id: "m2",
            name: "Intake pipeline live in staging",
            description: "Capture, qualification and scheduling working end to end against test data.",
            startOffsetDays: 7,
            durationDays: 14,
            deliverables: ["Unified capture", "AI qualification", "Scheduling integration"],
            isPaymentMilestone: false,
          },
          {
            id: "m3",
            name: "Follow-up sequences & dashboard",
            description: "Multi-touch cadences and the live pipeline view.",
            startOffsetDays: 21,
            durationDays: 10,
            deliverables: ["Follow-up sequences", "Pipeline dashboard"],
            isPaymentMilestone: false,
          },
          {
            id: "m4",
            name: "Production go-live",
            description: "Cut over to live enquiries with monitoring in place.",
            startOffsetDays: 31,
            durationDays: 5,
            deliverables: ["Production deployment"],
            isPaymentMilestone: true,
          },
          {
            id: "m5",
            name: "Documentation, video & training",
            description:
              "Technical documentation, recorded video overview, and the live team training session.",
            startOffsetDays: 36,
            durationDays: 6,
            deliverables: ["Technical documentation", "Video overview", "Training session"],
            isPaymentMilestone: false,
          },
        ],
      },
    },

    {
      id: "pricing",
      order: 5,
      visible: true,
      schemaVersion: 1,
      type: "PRICING_TIERS",
      data: {
        eyebrow: "Investment",
        title: "Choose your engagement",
        intro: "Every option includes full source code ownership. There is no lock-in to us.",
        selectable: true,
        footnote:
          "Prices exclude the third-party service costs listed below, which you pay directly to those vendors.",
        tiers: [
          {
            key: "essential",
            name: "Essential",
            summary: "The intake pipeline itself, without the follow-up layer.",
            priceMinor: 349_900,
            billingPeriod: "ONE_TIME",
            isRecommended: false,
            ctaLabel: "Select Essential",
            features: [
              { id: "f1", label: "Unified enquiry capture", included: true },
              { id: "f2", label: "AI qualification & response drafting", included: true },
              { id: "f3", label: "Scheduling integration", included: true },
              { id: "f4", label: "Technical documentation", included: true },
              { id: "f5", label: "Recorded video overview", included: true },
              { id: "f6", label: "Multi-touch follow-up sequences", included: false },
              { id: "f7", label: "Pipeline dashboard", included: false },
              { id: "f8", label: "30-day supported handover", included: false, detail: "14 days included" },
            ],
          },
          {
            key: "build",
            name: "Build",
            summary: "The complete system, end to end. What we'd recommend.",
            priceMinor: 499_900,
            billingPeriod: "ONE_TIME",
            isRecommended: true,
            ctaLabel: "Select Build",
            features: [
              { id: "f1", label: "Everything in Essential", included: true },
              { id: "f2", label: "Multi-touch follow-up sequences", included: true, detail: "Email and SMS, stop-on-reply" },
              { id: "f3", label: "Pipeline dashboard", included: true },
              { id: "f4", label: "Live team training session", included: true },
              { id: "f5", label: "30-day supported handover", included: true },
              { id: "f6", label: "Weekly progress demos", included: true },
              { id: "f7", label: "Full source code ownership", included: true },
            ],
          },
          {
            key: "retainer",
            name: "Build + Retainer",
            summary: "The full build, then ongoing iteration as your volume grows.",
            priceMinor: 999_900,
            billingPeriod: "MONTHLY",
            isRecommended: false,
            badge: "Ongoing",
            ctaLabel: "Select Retainer",
            features: [
              { id: "f1", label: "Everything in Build", included: true },
              { id: "f2", label: "Dedicated AI engineer", included: true },
              { id: "f3", label: "Unlimited iterations", included: true },
              { id: "f4", label: "Priority support", included: true, detail: "4-hour response SLA" },
              { id: "f5", label: "Monthly strategy sessions", included: true },
              { id: "f6", label: "Infrastructure monitoring", included: true },
            ],
          },
        ],
      },
    },

    {
      id: "addons",
      order: 6,
      visible: true,
      schemaVersion: 1,
      type: "ADD_ONS",
      data: {
        eyebrow: "Optional",
        title: "Add-ons",
        intro: "Tick anything you'd like included. The total updates as you go.",
        addOns: [
          {
            key: "spanish",
            name: "Spanish-language intake",
            description:
              "Full qualification and follow-up flows in Spanish, with the same rule set applied.",
            priceMinor: 89_900,
            billingPeriod: "ONE_TIME",
            selectedByDefault: false,
          },
          {
            key: "insurance-verify",
            name: "Automated insurance verification",
            description:
              "Real-time eligibility checks against major payers, attached to the enquiry before it reaches your team.",
            priceMinor: 129_900,
            billingPeriod: "ONE_TIME",
            selectedByDefault: false,
          },
          {
            key: "extended-support",
            name: "Extended support",
            description: "Ongoing monitoring and fixes beyond the included 30 days.",
            priceMinor: 49_900,
            billingPeriod: "MONTHLY",
            selectedByDefault: false,
          },
        ],
      },
    },

    {
      id: "costs",
      order: 7,
      visible: true,
      schemaVersion: 1,
      type: "SERVICE_COSTS",
      data: {
        eyebrow: "Running costs",
        title: "What the infrastructure actually costs",
        intro:
          "These are the third-party services the system runs on, at your expected volume. You hold these accounts directly, so you keep control of them and can see exactly what you're paying for. We don't mark any of it up.",
        showTotals: true,
        footnote:
          "Estimated at roughly 400 enquiries per month. Costs scale with volume; the dominant variable is the language model, and we'll show you how to tune that.",
        rows: [
          {
            id: "c1",
            vendor: "Anthropic",
            purpose: "Qualification and response drafting",
            planName: "API, usage-based",
            monthlyCostMinor: 4_500,
            setupCostMinor: 0,
            billedTo: "CLIENT",
            notes: "≈$45/mo at 400 enquiries",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "c2",
            vendor: "Twilio",
            purpose: "SMS follow-up and call transcription",
            planName: "Pay as you go",
            monthlyCostMinor: 3_200,
            setupCostMinor: 0,
            billedTo: "CLIENT",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "c3",
            vendor: "Supabase",
            purpose: "Database and pipeline state",
            planName: "Pro",
            monthlyCostMinor: 2_500,
            setupCostMinor: 0,
            billedTo: "CLIENT",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "c4",
            vendor: "Resend",
            purpose: "Transactional email",
            planName: "Pro",
            monthlyCostMinor: 2_000,
            setupCostMinor: 0,
            billedTo: "CLIENT",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "c5",
            vendor: "Vercel",
            purpose: "Dashboard hosting",
            planName: "Hobby",
            monthlyCostMinor: 0,
            setupCostMinor: 0,
            billedTo: "CLIENT",
            notes: "Free tier is sufficient at your volume",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "c6",
            vendor: "Sentry",
            purpose: "Error monitoring",
            planName: "Team",
            monthlyCostMinor: 2_600,
            setupCostMinor: 0,
            billedTo: "AGENCY",
            notes: "On our account during the supported period",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
        ],
      },
    },

    {
      id: "limits",
      order: 8,
      visible: true,
      schemaVersion: 1,
      type: "TIER_LIMITS",
      data: {
        eyebrow: "Free vs paid",
        title: "Where the free tiers stop",
        intro:
          "Several of these services have usable free tiers. Here is exactly where each one runs out, and what happens when it does, so nothing surprises you in month three.",
        rows: [
          {
            id: "l1",
            vendor: "Supabase",
            freeLimit: "500 MB database, 2 GB bandwidth, 50k monthly active users",
            freeCaveat:
              "Projects pause after 7 days of inactivity, and there are no daily backups. For patient data neither is acceptable in production.",
            paidLimit: "8 GB database, 250 GB bandwidth, daily backups, no pausing",
            paidPriceNote: "$25/month",
            recommendation:
              "Start on Pro. This is not a tier to economise on when the data is clinical.",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "l2",
            vendor: "Resend",
            freeLimit: "3,000 emails/month, 100/day",
            freeCaveat:
              "The 100/day cap is the real constraint. A follow-up sequence across a backlog will hit it and silently queue.",
            paidLimit: "50,000 emails/month, no daily cap",
            paidPriceNote: "$20/month",
            recommendation:
              "Free tier is fine for the first month while volume is low. Move to Pro before you enable full follow-up sequencing.",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "l3",
            vendor: "Vercel",
            freeLimit: "100 GB bandwidth, 1M function invocations",
            freeCaveat:
              "Hobby is licensed for non-commercial use only. An internal clinic dashboard is a grey area worth resolving deliberately.",
            paidLimit: "1 TB bandwidth, commercial use, team access",
            paidPriceNote: "$20/user/month",
            recommendation:
              "Stay on Hobby while it is a single-user internal tool. Move to Pro when a second person needs access.",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
          {
            id: "l4",
            vendor: "Twilio",
            freeLimit: "Trial credit only",
            freeCaveat:
              "Trial accounts prefix every message with a trial notice and can only send to verified numbers. Unusable for real patients.",
            paidLimit: "Pay-as-you-go, no cap",
            paidPriceNote: "≈$0.0079 per SMS segment",
            recommendation: "Paid from day one. There is no meaningful free path here.",
            aiGenerated: false,
            verifiedAt: "2026-09-07T00:00:00.000Z",
          },
        ],
      },
    },

    {
      id: "blueprint",
      order: 9,
      visible: true,
      schemaVersion: 1,
      type: "BLUEPRINT_OFFER",
      data: {
        eyebrow: "Included at no cost",
        title: "Your AI opportunity blueprint",
        valueLabel: "Normally $1,500",
        body:
          "Before we write any code, we produce a written blueprint of every automatable process in your practice, ranked by hours saved against effort to build. You keep it whether or not you proceed with us, and you are free to hand it to another firm.",
        bullets: [
          "Every intake and admin process, mapped and scored",
          "Estimated hours recovered per process",
          "Build-vs-buy recommendation for each",
          "A sequenced 12-month roadmap",
        ],
        condition: "Included free when this proposal is accepted before 7 October 2026.",
      },
    },

    {
      id: "payment",
      order: 10,
      visible: true,
      schemaVersion: 1,
      type: "PAYMENT",
      data: {
        eyebrow: "Payment",
        title: "Securing your start date",
        intro: "Two payments, tied to milestones rather than dates.",
        note:
          "The balance falls due at production go-live. Payment is by card or bank transfer; an invoice is issued automatically on acceptance.",
      },
    },

    {
      id: "terms",
      order: 11,
      visible: true,
      schemaVersion: 1,
      type: "TERMS",
      data: {
        eyebrow: "Terms",
        title: "Terms & conditions",
        paymentTerms: "50% deposit on acceptance, balance net 15 from go-live.",
        governingLaw: "To be confirmed",
        body: paragraphs(
          "This proposal is valid until the date shown on the cover. Pricing is held for that period and may be revised afterwards.",
          "You own all source code, documentation and configuration produced under this engagement outright, on final payment. We retain no licence over your deliverables and claim no right to reuse your data.",
          "Third-party service costs are billed directly to you by those vendors and are not marked up by us. Estimates given are based on your stated volumes and will vary with actual usage.",
          "Either party may terminate with 14 days written notice. On termination you pay for work completed to that point and receive everything produced.",
          "This proposal does not itself create a binding contract for services. Acceptance here confirms scope and pricing; the engagement is governed by the separate agreement referenced above.",
        ),
      },
    },

    {
      id: "signature",
      order: 12,
      visible: true,
      schemaVersion: 1,
      type: "SIGNATURE",
      data: {
        eyebrow: "Acceptance",
        title: "Accept this proposal",
        intro:
          "Selecting a tier above and signing here confirms the scope, pricing and timeline set out in this document.",
        consentText:
          "By signing below I agree to transact electronically, and I intend this electronic signature to be the legal equivalent of my handwritten signature on this proposal. I understand I may request a paper copy at no charge, and may withdraw consent to transact electronically by contacting the sender before signing.",
        consentVersion: "1.0",
        requireTitle: true,
        externalTitle: "Next steps",
        externalBody:
          "Approving this proposal confirms the scope, pricing and timeline above. The contract itself will be sent and signed on Upwork, and work begins once that contract is accepted.",
        externalCtaLabel: "Approve this scope",
        externalLinkLabel: "Open the Upwork contract",
      },
    },
  ],
};
