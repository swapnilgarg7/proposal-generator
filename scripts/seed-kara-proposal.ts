import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  computeContentHash,
  computeEventHash,
  generateShareToken,
  type ProposalSnapshot,
} from "../lib/versioning/snapshot";

/**
 * Seeds the real "AI Voice Outbound Agent" proposal for Kara Ntumy.
 *
 * Content is copied across verbatim from the source document. Where the
 * document's prose had to become structured data (tier features, cost rows,
 * milestones) the wording is preserved rather than paraphrased.
 *
 * Idempotent on title: re-running replaces the draft blocks and mints a new
 * version rather than duplicating the proposal.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const TITLE = "AI Voice Outbound Agent";

// ── Tiptap helpers ───────────────────────────────────────────────
const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const bold = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text, marks: [{ type: "bold" }] }],
});

const heading = (text: string, level = 3) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const orderedList = (items: string[]) => ({
  type: "orderedList",
  content: items.map((text) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  })),
});

const doc = (...content: unknown[]) => ({ type: "doc" as const, content });

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: "sorvexai" } });
  if (!org) throw new Error("Organisation not seeded. Run `npm run db:seed` first.");

  // ── Client ─────────────────────────────────────────────────────
  // Company name and email are not in the source document. Left null rather
  // than invented: both appear on a document a client signs.
  let client = await prisma.client.findFirst({
    where: { organizationId: org.id, company: "Kara Ntumy" },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        organizationId: org.id,
        company: "Kara Ntumy",
        industry: "AI search visibility for care homes and senior living",
        source: "upwork",
        notes:
          "Sells AI/SEO visibility services to US care home and senior living operators. " +
          "Company name and contact email still needed for the signature block.",
      },
    });
  }

  const blocks: Array<{ type: string; data: unknown }> = [];

  // ── Cover ──────────────────────────────────────────────────────
  blocks.push({
    type: "COVER",
    data: {
      eyebrow: "Proposal",
      title: "AI Voice Outbound Agent",
      subtitle:
        "An outbound calling agent that works your list of US care home and senior living operators, gets past the front desk, qualifies, and books the call on your calendar.",
      preparedForLabel: "Prepared for",
      preparedByLabel: "Prepared by",
      showValidity: true,
      showClientLogo: true,
    },
  });

  // ── What this does ─────────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "Overview",
      title: "What this does",
      body: doc(
        p(
          "An outbound calling agent that works a list of US care home and senior living operators you supply, gets past the front desk, asks three qualifying questions, and books a call with you on your calendar. It is a booking agent, not a closer. That is the right job for AI voice right now, and it is what I am scoping.",
        ),
        p(
          "The pitch it runs: they show up on Google, but not in AI answers, and their competitors are already moving on this. That is enough to earn a 15 minute call.",
        ),
      ),
    },
  });

  // ── Call flow ──────────────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "How it works",
      title: "Call flow",
      body: doc(
        orderedList([
          "Agent dials from your list, one lead at a time, with configurable pacing.",
          "Gatekeeper handling. If a receptionist picks up, the agent asks for the owner or manager by name if you have it, or by role if you do not. It has scripted branches for “he’s not in”, “send an email”, “who’s calling”, “we’re not interested”. It does not pitch the gatekeeper.",
          "If it reaches the decision maker, short opener with the AI disclosure, then three qualifying questions. Final wording agreed with you before we go live.",
          "If interested, it reads live availability off your Google Calendar and books the slot on the call.",
          "Confirmation email goes out to the lead automatically.",
          "Every call gets logged: outcome, transcript, recording, and a two line summary.",
          "No answer or voicemail goes into a retry queue with rules you set.",
        ]),
      ),
    },
  });

  // ── Scope of work ──────────────────────────────────────────────
  blocks.push({
    type: "SCOPE_OF_WORK",
    data: {
      eyebrow: "Scope of work",
      title: "What gets built",
      intro:
        "Everything gets built inside accounts in your name, so you own it outright and nothing breaks if we stop working together.",
      phases: [
        {
          id: "ph1",
          name: "Script and voice",
          summary: "Agreed before anything gets dialled.",
          deliverables: [
            {
              id: "d1",
              name: "Call script and three qualifying questions",
              description:
                "Opener with the AI disclosure, the three qualifying questions, and objection handling.",
              acceptanceCriteria: "You sign off on the script before we go live.",
            },
            {
              id: "d2",
              name: "Gatekeeper playbook",
              description:
                "Scripted branches for the common front-desk deflections. The agent never pitches the gatekeeper.",
            },
            {
              id: "d3",
              name: "Reusable campaign configuration",
              description:
                "The script, the three questions, the lead list, the calendar and the caller ID are stored as configuration rather than baked into the agent. Pointing it at a different ICP is a config change, not a rebuild, and the walkthrough video covers how to do it yourself.",
              acceptanceCriteria:
                "You change the script on a test campaign without touching any code.",
            },
            {
              id: "d3b",
              name: "Voice selection",
              description:
                "A stock voice from Vapi's library, chosen with you and tested on real calls before we go live.",
            },
          ],
        },
        {
          id: "ph2",
          name: "Agent and telephony",
          summary: "The system that actually places calls.",
          deliverables: [
            {
              id: "d4",
              name: "Vapi voice agent",
              description: "Built to your script, with objection handling and retry rules you set.",
            },
            {
              id: "d5",
              name: "Dialling on your existing Twilio number",
              description: "No new number, no new cost.",
            },
            {
              id: "d6",
              name: "Calendar booking",
              description:
                "A Cal.com link sent after a positive call on Starter; live on-call booking against your real Google Calendar availability on Core and Full.",
              acceptanceCriteria: "A test booking lands correctly in your calendar.",
            },
          ],
        },
        {
          id: "ph3",
          name: "Logging and handover",
          summary: "So you can run and edit this yourself.",
          deliverables: [
            {
              id: "d7",
              name: "Call logging",
              description:
                "Outcome, transcript, recording and a two line summary for every call, linked in the sheet.",
            },
            {
              id: "d8",
              name: "Loom walkthrough",
              description: "So you can edit the script yourself without coming back to me.",
            },
            {
              id: "d9",
              name: "Post-handover support",
              description: "7 days on Starter, 14 on Core, 30 on Full.",
            },
          ],
        },
      ],
      outOfScope: [
        "Buying or scraping the lead list",
        "Writing scripts for additional ICPs. The system runs as many campaigns as you like; each new script is scoped separately",
        "The actual SEO or AI visibility work you sell on the call",
        "Ongoing campaign management after handover. Available as a separate monthly retainer",
        "Inbound call handling. Can be added later, it reuses most of the same setup",
      ],
      clientResponsibilities: [
        "The lead list, with business name, phone, and owner name where you have it",
        "Google Calendar access for booking",
        "Access to your Twilio and Vapi accounts, or an invite to them",
        "Sign off on the script before we go live",
        "A separate phone number per ICP if you plan to run campaigns concurrently, at roughly $1 to $2 a month each",
      ],
      assumptions: [
        "Calls are B2B, to businesses rather than residences",
        "Your existing Twilio number is in good standing and usable for outbound",
        "Lead volume stays around 500 dials per month",
      ],
    },
  });

  // ── Reuse across ICPs ──────────────────────────────────────────
  // Added after Kara asked whether the agent could be reused for other ICPs,
  // and run concurrently. It is a buying signal, so the document should answer
  // it rather than leaving it to a reply she has to go find later.
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "Reuse",
      title: "Running this for more than one ICP",
      body: doc(
        p(
          "Yes to both parts: the script is interchangeable, and campaigns can run at the same time. Worth being precise about what that means in practice.",
        ),
        heading("Swapping the script"),
        p(
          "The script and the three qualifying questions live in configuration, not baked into the agent. Pointing it at a different ICP means editing a few fields, not rebuilding anything. The walkthrough video covers how, so you can add a vertical yourself without coming back to me.",
        ),
        heading("Running campaigns concurrently"),
        p(
          "Each campaign carries its own script, questions, lead list, calendar and caller ID, and they run side by side. Four things are worth knowing before you do:",
        ),
        {
          type: "bulletList",
          content: [
            "Use a separate phone number per ICP. You do not technically have to, but one number dialling care homes and, say, dentists picks up spam flags faster and your answer rate drops. Numbers are roughly $1 to $2 a month on Twilio, which makes this the cheapest insurance you will buy.",
            "Concurrency has a ceiling. Vapi limits how many calls run at once depending on your plan. Worth checking yours before running several campaigns at full tilt, otherwise they quietly queue behind each other rather than failing visibly.",
            "Do-not-call suppression is global, not per campaign. If someone tells one campaign to remove them, no other campaign will dial them. That is both the right thing and the safer position if anyone ever asks.",
            "Give each campaign its own booking calendar, or accept the occasional double-book. Two campaigns writing to one calendar at the same moment can collide.",
          ].map((text) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          })),
        },
        heading("What this costs"),
        p(
          "The system handling multiple campaigns is included in every package. It is a design decision rather than extra work, and it is cheaper to build in now than to retrofit later.",
        ),
        p(
          "What is not free is the script itself. Writing and tuning a genuinely good opener for a new ICP is real work, and a weak script on a strong system still will not book. You can write them yourself off the walkthrough, or I can scope them per vertical.",
        ),
      ),
    },
  });

  // ── Pricing ────────────────────────────────────────────────────
  blocks.push({
    type: "PRICING_TIERS",
    data: {
      eyebrow: "Packages",
      title: "Three ways to run this",
      intro:
        "Everything is built in accounts in your name. Prices exclude the third party running costs below, which you pay directly to those vendors.",
      selectable: true,
      footnote:
        "I am pricing this below my usual rate because I want the contract on my Upwork record. That is the trade and I am fine with it.",
      tiers: [
        {
          key: "starter",
          name: "Starter",
          summary: "The working system, kept simple.",
          priceMinor: 400_00,
          billingPeriod: "ONE_TIME",
          isRecommended: false,
          ctaLabel: "Select Starter",
          features: [
            { id: "s1", label: "Vapi agent with your script, three qualifying questions, objection handling", included: true },
            { id: "s2", label: "Gatekeeper handling", included: true, detail: "Basic: ask for owner, take one deflection, exit politely" },
            { id: "s3", label: "Dialling setup on your existing Twilio number", included: true },
            { id: "s4", label: "Voice", included: true, detail: "Stock voice from Vapi's library, chosen with you" },
            { id: "s5", label: "Google Sheets as the lead list and results log", included: true },
            { id: "s5b", label: "Script and questions stored as configuration", included: true, detail: "Swap ICP without a rebuild" },
            { id: "s6", label: "Booking", included: true, detail: "Cal.com link sent by email after a positive call" },
            { id: "s7", label: "Call transcripts and recordings stored and linked in the sheet", included: true },
            { id: "s8", label: "Retry logic for no answer, up to 2 attempts", included: true },
            { id: "s9", label: "Loom walkthrough so you can edit the script yourself", included: true },
            { id: "s10", label: "Support after handover", included: true, detail: "7 days of bug fixes" },
            { id: "s11", label: "DNC suppression list", included: false },
            { id: "s12", label: "Script tuning rounds", included: false, detail: "None included" },
          ],
        },
        {
          key: "core",
          name: "Core",
          summary: "What I would pick.",
          priceMinor: 500_00,
          billingPeriod: "ONE_TIME",
          isRecommended: true,
          ctaLabel: "Select Core",
          features: [
            { id: "c1", label: "Everything in Starter", included: true },
            { id: "c3", label: "Live calendar booking during the call", included: true, detail: "Agent reads real availability and confirms the slot before hanging up" },
            { id: "c4", label: "Full gatekeeper playbook", included: true, detail: "Multiple branches, callback time capture, decision maker name capture" },
            { id: "c5", label: "Global DNC and do-not-call suppression", included: true, detail: "A “remove me” on one campaign is never dialled by another" },
            { id: "c6", label: "Daily post-call summary", included: true, detail: "Email or WhatsApp" },
            { id: "c7", label: "Dashboard view", included: true, detail: "Dials, connects, bookings, conversion, all in one sheet" },
            { id: "c8", label: "Support after handover", included: true, detail: "14 days of bug fixes" },
            { id: "c9", label: "Script tuning rounds", included: true, detail: "1 round once we have real call data" },
            { id: "c10", label: "A/B script testing", included: false },
            { id: "c11", label: "Automatic time zone enforcement", included: false, detail: "Set the window manually" },
          ],
        },
        {
          key: "full",
          name: "Full",
          summary: "Worth it if you plan to run this at real volume.",
          priceMinor: 600_00,
          billingPeriod: "ONE_TIME",
          isRecommended: false,
          ctaLabel: "Select Full",
          features: [
            { id: "f1", label: "Everything in Core", included: true },
            { id: "f2", label: "Two script variants as an A/B split", included: true, detail: "So we can see which opener books more" },
            { id: "f3", label: "Pre-call enrichment", included: true, detail: "Checks whether the care home shows up in AI search and drops that finding into the opener, so it sounds researched" },
            { id: "f4", label: "Voicemail drop", included: true, detail: "A recorded message instead of a silent hangup" },
            { id: "f5", label: "Warm transfer", included: true, detail: "If a lead wants to talk now and you are free, the call is patched to your phone" },
            { id: "f6", label: "Automatic time zone and calling window rules", included: true, detail: "Off the area code, so it never dials outside business hours" },
            { id: "f7", label: "Support after handover", included: true, detail: "30 days" },
            { id: "f8", label: "Script tuning rounds", included: true, detail: "2 rounds, plus one refresh of the qualifying questions" },
          ],
        },
      ],
    },
  });

  // ── Third party running costs ──────────────────────────────────
  // A fixed date, not `new Date()`. verifiedAt means "when a human last checked
  // this vendor's pricing", not "when the seed script ran" — and using now()
  // made the content hash change on every run for content that was identical.
  const verified = "2026-09-08T00:00:00.000Z";
  blocks.push({
    type: "SERVICE_COSTS",
    data: {
      eyebrow: "Running costs",
      title: "What the tooling actually costs",
      intro:
        "You pay these directly to the vendors, not to me. Nothing here is marked up. Figures assume roughly 500 dials a month averaging about 90 seconds, which is around 750 minutes.",
      showTotals: true,
      footnote:
        "Realistic monthly spend at 500 dials averaging around 90 seconds is roughly $65 to $95, all of it Vapi and Twilio minutes. Everything else stays on free tiers. First month is the build price plus that. After that it is usage only. Confirmations go out by email rather than SMS, which keeps you off SMS entirely and out of any A2P registration process.",
      rows: [
        {
          id: "v1",
          vendor: "Vapi",
          purpose: "Voice platform, usage based",
          planName: "Pay as you go",
          vendorUrl: "https://vapi.ai/pricing",
          monthlyCostMinor: 55_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Roughly $0.05–$0.09 per minute all in. Required, no free path.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "v2",
          vendor: "Twilio",
          purpose: "Outbound minutes on your existing number",
          planName: "Pay as you go",
          vendorUrl: "https://www.twilio.com/en-us/voice/pricing/us",
          monthlyCostMinor: 11_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "About $0.014 per minute US outbound. No new number, so no new line rental.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "v4",
          vendor: "n8n",
          purpose: "Automation layer",
          planName: "Self hosted",
          vendorUrl: "https://n8n.io/pricing",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Free self hosted is fine at your volume. Cloud is about $24/mo if you would rather not host it.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "v5",
          vendor: "Google Sheets",
          purpose: "Lead list and results log",
          planName: "Free",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Enough for this. Do not pay for a CRM yet.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "v6",
          vendor: "Cal.com",
          purpose: "Scheduling",
          planName: "Free",
          vendorUrl: "https://cal.com/pricing",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Free tier is enough.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "v7",
          vendor: "Gmail via n8n",
          purpose: "Confirmation email",
          planName: "Free",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "No ESP needed at this volume.",
          aiGenerated: false,
          verifiedAt: verified,
        },
      ],
    },
  });

  // ── Free vs paid ───────────────────────────────────────────────
  blocks.push({
    type: "TIER_LIMITS",
    data: {
      eyebrow: "Free vs paid",
      title: "Where to spend and where not to",
      intro:
        "Free path and paid path for each tool, so you can decide where the money actually needs to go.",
      rows: [
        {
          id: "t1",
          vendor: "Voice platform (Vapi)",
          vendorUrl: "https://vapi.ai/pricing",
          freeLimit: "None. Vapi is usage based",
          freeCaveat: "There is no free path here. Every minute is billed from the first call.",
          paidLimit: "Unlimited, usage billed",
          paidPriceNote: "Roughly $0.05–$0.09 per minute all in",
          recommendation: "Required. Budget for it as the main variable cost.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "t2",
          vendor: "Phone number and minutes (Twilio)",
          vendorUrl: "https://www.twilio.com/en-us/voice/pricing/us",
          freeLimit: "You already have the number",
          freeCaveat: "The number is covered, but outbound minutes are always billed.",
          paidLimit: "Usage billed",
          paidPriceNote: "About $0.014 per minute US outbound",
          recommendation: "No new cost beyond minutes.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "t4",
          vendor: "Automation layer (n8n / Make)",
          vendorUrl: "https://n8n.io/pricing",
          freeLimit: "n8n self hosted, free. Or the Make free tier",
          freeCaveat: "Self hosting means you maintain it. Make's free tier caps operations per month.",
          paidLimit: "n8n Cloud, managed",
          paidPriceNote: "About $24 per month",
          recommendation: "The free path is fine at your volume.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "t5",
          vendor: "CRM (Sheets / Airtable)",
          vendorUrl: "https://airtable.com/pricing",
          freeLimit: "Google Sheets, free",
          freeCaveat: "Sheets gets slow past tens of thousands of rows, which is well beyond this campaign.",
          paidLimit: "Airtable Team",
          paidPriceNote: "$20 per user per month",
          recommendation: "Sheets is enough. Do not pay for this yet.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "t6",
          vendor: "Scheduling (Cal.com / Calendly)",
          vendorUrl: "https://cal.com/pricing",
          freeLimit: "Cal.com, free",
          freeCaveat: "No meaningful limit at this volume.",
          paidLimit: "Calendly Standard",
          paidPriceNote: "$12 per month",
          recommendation: "Cal.com is enough.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "t7",
          vendor: "Confirmation email",
          freeLimit: "Gmail via n8n, free",
          freeCaveat: "Gmail sending limits apply, but they are far above this volume.",
          paidLimit: "Any transactional email provider",
          paidPriceNote: "$15 and up per month",
          recommendation: "The free path is fine.",
          aiGenerated: false,
          verifiedAt: verified,
        },
      ],
    },
  });

  // ── Timeline ───────────────────────────────────────────────────
  blocks.push({
    type: "TIMELINE",
    data: {
      eyebrow: "Timeline",
      title: "How this ships",
      intro:
        "Working days. Starter is 4 to 5, Core is 7 to 8, Full is 10 to 12. The track below shows the Full build.",
      showGantt: true,
      showAbsoluteDates: false,
      milestones: [
        {
          id: "m1",
          name: "Kickoff and script",
          description: "Kickoff call, script written, qualifying questions locked, voice chosen.",
          startOffsetDays: 0,
          durationDays: 2,
          deliverables: ["Call script", "Three qualifying questions", "Voice selected"],
          isPaymentMilestone: false,
        },
        {
          id: "m2",
          name: "Agent build",
          description: "Agent build, telephony wiring, calendar and CRM setup.",
          startOffsetDays: 2,
          durationDays: 4,
          deliverables: ["Vapi agent", "Twilio dialling", "Calendar booking", "Sheet logging"],
          isPaymentMilestone: false,
        },
        {
          id: "m3",
          name: "Internal test calls",
          description: "Internal test calls, you listen back, we fix tone and pacing.",
          startOffsetDays: 6,
          durationDays: 2,
          deliverables: ["Test call recordings", "Tone and pacing fixes"],
          isPaymentMilestone: false,
        },
        {
          id: "m4",
          name: "Live pilot",
          description: "Live pilot on 20 to 30 real leads, then tuning.",
          startOffsetDays: 8,
          durationDays: 2,
          deliverables: ["20–30 live dials", "Script tuning on real data"],
          isPaymentMilestone: false,
        },
        {
          id: "m5",
          name: "Handover",
          description: "Handover, walkthrough video, docs.",
          startOffsetDays: 10,
          durationDays: 1,
          deliverables: ["Loom walkthrough", "Documentation"],
          isPaymentMilestone: true,
        },
      ],
    },
  });

  // ── Honest notes ───────────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "Straight talk",
      title: "Honest notes",
      body: doc(
        heading("Compliance, US"),
        p(
          "These are B2B calls to businesses, which is the easier side of the rules, but it is not zero.",
        ),
        {
          type: "bulletList",
          content: [
            "The federal DNC registry covers residential lines. Some care homes are run out of a home or use a personal mobile, so the list still gets scrubbed before we dial.",
            "Several states now require an AI caller to disclose it is AI. Rather than track which state each number sits in, the disclosure goes into the opener by default and applies everywhere. It costs a second of call time and keeps you clean nationwide.",
            "Calling window is 8am to 9pm in the lead's local time. Full enforces this automatically off the area code. On Starter and Core you set the window manually.",
          ].map((text) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          })),
        },
        p(
          "I am not a lawyer and this is not legal advice. Worth a short check with someone who is before you go past a few hundred dials.",
        ),
        heading("What AI voice is actually good at"),
        p(
          "Booking and qualifying, yes. Closing, no. Your instinct on that was right. Expect it to sound good but not perfect. A percentage of people will clock it. For appointment setting that is survivable.",
        ),
        heading("Numbers to expect"),
        p(
          "On cold B2B lists like this, connect rates usually land somewhere between 15 and 30 percent, and bookings from connects maybe 5 to 12 percent. That is a wide range and it depends heavily on list quality. I would rather tell you that now than promise a number I cannot hold.",
        ),
      ),
    },
  });

  // ── Recommendation ─────────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "My recommendation",
      title: "Core at $500",
      body: doc(
        p(
          "Live on-call booking is the single thing that moves the needle most. A link sent afterwards loses people between the call ending and the email landing; booking the slot while you have them on the phone does not.",
        ),
        p(
          "The full gatekeeper playbook is what gets you past the front desk at all, and the DNC suppression list saves you a headache later. Full is worth it only if you plan to run this at real volume, in which case the A/B testing pays for itself quickly.",
        ),
      ),
    },
  });

  // ── Terms ──────────────────────────────────────────────────────
  blocks.push({
    type: "TERMS",
    data: {
      eyebrow: "Terms",
      title: "Payment and terms",
      paymentTerms: "Handled through Upwork, released on submission of the completed build.",
      body: doc(
        bold("Payment"),
        p("Handled through Upwork, released on submission of the completed build."),
        p(
          "I am pricing this below my usual rate because I want the contract on my Upwork record. That is the trade and I am fine with it.",
        ),
        bold("Ownership"),
        p(
          "Everything gets built inside accounts in your name, so you own it outright and nothing breaks if we stop working together.",
        ),
        bold("Third party costs"),
        p(
          "Tooling costs are billed directly to you by those vendors and are not marked up by me. Estimates are based on roughly 500 dials a month and will vary with actual usage.",
        ),
      ),
    },
  });

  // ── Acceptance ─────────────────────────────────────────────────
  blocks.push({
    type: "SIGNATURE",
    data: {
      eyebrow: "Acceptance",
      title: "Approve this scope",
      consentText:
        "By signing below I agree to transact electronically, and I intend this electronic signature to be the legal equivalent of my handwritten signature on this proposal.",
      consentVersion: "1.0",
      requireTitle: false,
      externalTitle: "Next steps",
      externalBody:
        "Approving this proposal confirms the package, scope and timeline above. The contract and payment both run through Upwork, and the funds are released on submission of the completed build.",
      externalCtaLabel: "Approve this scope",
      externalLinkLabel: "Open the Upwork contract",
    },
  });

  // ── Persist ────────────────────────────────────────────────────
  const existing = await prisma.proposal.findFirst({
    where: { organizationId: org.id, title: TITLE },
  });

  const share = existing?.publicTokenHash ? null : generateShareToken();

  const proposal = existing
    ? await prisma.proposal.update({
        where: { id: existing.id },
        data: { blocks: { deleteMany: {} } },
      })
    : await prisma.proposal.create({
        data: {
          organizationId: org.id,
          clientId: client.id,
          title: TITLE,
          status: "DRAFT",
          theme: "DARK",
          currency: "USD",
          validUntil: new Date("2026-10-08T00:00:00.000Z"),
          // Payment runs through Upwork, so our own checkout stays off.
          paymentEnabled: false,
          paymentTiming: "NONE",
          agreementMode: "EXTERNAL_UPWORK",
          externalAgreementNote:
            "The Upwork contract mirrors the package, scope and milestones set out above. Funds are released on submission of the completed build.",
          publicTokenHash: share!.tokenHash,
        },
      });

  await prisma.proposalBlock.createMany({
    data: blocks.map((b, i) => ({
      proposalId: proposal.id,
      type: b.type as never,
      order: i,
      data: b.data as object,
      visible: true,
      schemaVersion: 1,
    })),
  });

  // Freeze and publish a version. The public page renders this, never the
  // draft rows.
  const snapshot: ProposalSnapshot = {
    snapshotVersion: 1,
    proposalId: proposal.id,
    title: TITLE,
    currency: "USD",
    theme: "DARK",
    validUntil: "2026-10-08T00:00:00.000Z",
    projectStartDate: null,
    paymentEnabled: false,
    paymentTiming: "NONE",
    depositPercent: null,
    agreementMode: "EXTERNAL_UPWORK",
    externalAgreementUrl: null,
    externalAgreementNote:
      "The Upwork contract mirrors the package, scope and milestones set out above. Funds are released on submission of the completed build.",
    organization: {
      name: org.name,
      legalName: org.legalName,
      email: org.email,
      website: org.website,
      logoPath: org.logoPath,
      primaryColor: org.primaryColor,
      accentColor: org.accentColor,
      tertiaryColor: org.tertiaryColor,
      addressLines: [],
      taxId: org.taxId,
      governingLaw: org.governingLaw,
      signatureBlockName: "Swapnil Garg",
      signatureBlockTitle: org.signatureBlockTitle,
    },
    client: {
      company: client.company,
      website: client.website,
      logoPath: client.logoPath,
      contactName: "Kara Ntumy",
      contactEmail: null,
      contactTitle: null,
    },
    blocks: blocks.map((b, i) => ({
      id: `b${i}`,
      order: i,
      visible: true,
      schemaVersion: 1,
      type: b.type,
      data: b.data,
    })) as ProposalSnapshot["blocks"],
  };

  const lastVersion = await prisma.proposalVersion.findFirst({
    where: { proposalId: proposal.id },
    orderBy: { versionNumber: "desc" },
  });

  const contentHash = computeContentHash(snapshot);

  // Version history should record real publish events, not every time a script
  // ran. If the content is byte-identical to the current version, reuse it.
  let version = lastVersion;
  let minted = false;

  if (!lastVersion || lastVersion.contentHash !== contentHash) {
    version = await prisma.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        snapshot: snapshot as object,
        contentHash,
      },
    });
    minted = true;

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { publishedVersionId: version.id, publishedAt: new Date() },
    });

    const at = new Date();
    const prev = await prisma.proposalEvent.findFirst({
      where: { proposalId: proposal.id },
      orderBy: { at: "desc" },
    });
    await prisma.proposalEvent.create({
      data: {
        proposalId: proposal.id,
        type: "PUBLISHED",
        at,
        prevEventHash: prev?.eventHash ?? null,
        eventHash: computeEventHash(prev?.eventHash ?? null, {
          type: "PUBLISHED",
          at: at.toISOString(),
        }),
      },
    });
  } else if (proposal.publishedVersionId !== lastVersion.id) {
    // Content unchanged but the previous run died before publishing it.
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { publishedVersionId: lastVersion.id, publishedAt: new Date() },
    });
  }

  console.log(`\nProposal: ${TITLE}`);
  console.log(`  id           ${proposal.id}`);
  console.log(`  blocks       ${blocks.length}`);
  console.log(`  version      v${version!.versionNumber}${minted ? " (new)" : " (unchanged, reused)"}`);
  console.log(`  contentHash  ${version!.contentHash}`);
  if (share) {
    console.log(`\n  Share link:  /p/${share.token}`);
    console.log(`  (shown once — only its SHA-256 is stored)`);
  } else {
    console.log(`\n  Existing share link kept. Re-issue it from the app if you need it again.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
