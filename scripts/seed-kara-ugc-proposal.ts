import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { parseBlockData, type BlockTypeName } from "../lib/blocks/schemas";
import {
  computeContentHash,
  computeEventHash,
  generateShareToken,
  type ProposalSnapshot,
} from "../lib/versioning/snapshot";

/**
 * Seeds the "AI UGC Video Engine, TikTok" proposal for Kara Ntumy.
 *
 * Second proposal for the same client as seed-kara-proposal.ts, so the Client
 * row is reused rather than duplicated.
 *
 * Content is the source document verbatim wherever the wording survives the
 * move into structured data. The source's covering note (the internal steer
 * about which engagement she actually has budget for) is deliberately NOT in
 * here: it is addressed to the sender, not to the client, and it discusses the
 * pricing strategy behind the tiers she is being asked to choose between.
 *
 * Idempotent on title: re-running replaces the draft blocks and mints a new
 * version rather than duplicating the proposal.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const TITLE = "AI UGC Video Engine, TikTok";
const VALID_UNTIL = "2026-10-08T00:00:00.000Z";

const EXTERNAL_NOTE =
  "The Upwork contract mirrors the package, scope and timeline set out above. " +
  "Funds are released on submission.";

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
  // Same person as the voice-agent proposal. The industry line was written for
  // that engagement's niche; widened here rather than overwritten, because
  // both proposals are live against this one record.
  const client = await prisma.client.findFirst({
    where: { organizationId: org.id, company: "Kara Ntumy" },
  });
  if (!client) {
    throw new Error(
      "Client 'Kara Ntumy' not found. Run scripts/seed-kara-proposal.ts first — " +
        "this proposal reuses that Client row rather than creating a second one.",
    );
  }

  await prisma.client.update({
    where: { id: client.id },
    data: {
      industry:
        "AI search visibility for care homes and senior living; separately, a consumer mobile app promoted on TikTok",
      notes:
        "Two live engagements. (1) AI Voice Outbound Agent, selling AI/SEO visibility to US care home " +
        "and senior living operators. (2) AI UGC Video Engine, promoting a consumer app on TikTok. " +
        "The app's niche is UNCONFIRMED — 'manifestations and affirmations' came up on the call and " +
        "the proposal asks her to confirm it, because it changes the trend research completely. " +
        "Company name and contact email still needed for the signature block.",
    },
  });

  const blocks: Array<{ type: BlockTypeName; data: unknown }> = [];

  // ── Cover ──────────────────────────────────────────────────────
  blocks.push({
    type: "COVER",
    data: {
      eyebrow: "Proposal",
      title: "AI UGC Video Engine, TikTok",
      subtitle:
        "A pipeline that studies what is already working in your niche, writes scripts in that format, " +
        "generates the video with a consistent character, burns in captions, and posts to TikTok on a " +
        "schedule. Target output is 3 posts per day per account, running without you touching it.",
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
          "A pipeline that studies what is already working in your niche, writes scripts in that format, generates the video with a consistent character, burns in captions, and posts to TikTok on a schedule. Target output is 3 posts per day per account, running without you touching it.",
        ),
        p(
          "Content type is reaction videos to demos of your app. Character on screen reacting, app screen recording alongside. That format is currently one of the highest performing UGC structures on TikTok because it gives the viewer a face to latch onto and a product demo at the same time.",
        ),
      ),
    },
  });

  // ── Q1: multi account ──────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "Answering your three questions",
      title: "What multi account actually looks like",
      body: doc(
        p(
          "Short version: going from 1 account to 5 is not 5x the work, but it is not free either. The build cost barely moves. The running cost and the risk both move a lot.",
        ),
        p(
          "The thing that breaks people is posting the same video to 10 accounts. TikTok fingerprints video and audio. Duplicate uploads get suppressed quietly, you never get a warning, the views just never come. So a real multi account setup needs a variation layer: different hook, different first three seconds, different voice, different caption, different music, different character per account. That is the part that costs money.",
        ),
      ),
    },
  });

  blocks.push({
    type: "COMPARISON_TABLE",
    data: {
      eyebrow: "Scaling",
      title: "What each account count costs you",
      columns: [
        { id: "a1", label: "1 account" },
        { id: "a3", label: "3 accounts" },
        { id: "a5", label: "5 accounts" },
        { id: "a10", label: "10 accounts" },
      ],
      rows: [
        {
          id: "r1",
          label: "Videos needed per month at 3 per day",
          cells: ["90", "270", "450", "900"],
        },
        { id: "r2", label: "Unique videos needed", cells: ["90", "270", "450", "900"] },
        { id: "r3", label: "Characters needed", cells: ["1", "3", "5", "10"] },
        {
          id: "r4",
          label: "Posting method",
          cells: ["Official TikTok API", "Official API", "Official API", "API plus scheduler"],
        },
        { id: "r5", label: "Suppression risk", cells: ["Low", "Low", "Medium", "High"] },
        {
          id: "r6",
          label: "Monthly tool cost, faceless",
          cells: ["~$15", "~$30", "~$45", "~$85"],
        },
        {
          id: "r7",
          label: "Monthly tool cost, AI avatar",
          cells: ["~$50", "~$110", "~$175", "~$330"],
        },
        {
          id: "r8",
          label: "Monthly tool cost, full AI generated",
          cells: ["~$180", "~$520", "~$860", "~$1,700"],
        },
        { id: "r9", label: "My build add on", cells: ["Included", "+$50", "+$100", "+$200"] },
      ],
      footnote:
        "Honest read: 10 accounts at 3 per day is 900 unique videos a month. Even at the cheap end that is a real spend and a real ban surface. I would start at 1, prove the format converts, then go to 3. Five is a reasonable ceiling for a solo operator. Ten is a business in itself. The other thing nobody mentions: 10 TikTok accounts need 10 phone numbers, 10 emails, and ideally warmed accounts that were not all created the same afternoon from the same IP. That part is manual and it is on you, not on the build.",
    },
  });

  // ── Q2: character consistency ──────────────────────────────────
  blocks.push({
    type: "COMPARISON_TABLE",
    data: {
      eyebrow: "Answering your three questions",
      title: "Character consistency, three ways to do it",
      intro:
        "You said one character per account, or faceless. Both work. They cost very different amounts.",
      columns: [
        { id: "faceless", label: "Faceless" },
        { id: "avatar", label: "AI avatar", note: "The sweet spot here", emphasis: true },
        { id: "fullai", label: "Fully AI generated" },
      ],
      rows: [
        {
          id: "c1",
          label: "What it looks like",
          cells: [
            "Hands, app screen, b roll, voiceover. No face",
            "Consistent AI presenter, talking head, app screen beside them",
            "AI generated person in real settings, reacting. Looks like a real UGC creator",
          ],
        },
        {
          id: "c2",
          label: "Tools",
          cells: [
            "ElevenLabs, screen recordings, stock b roll",
            "HeyGen or similar avatar tool",
            "Veo or Higgsfield, character locked with a reference image",
          ],
        },
        {
          id: "c3",
          label: "Consistency across videos",
          cells: [
            "Perfect, there is no face to drift",
            "Perfect, same avatar every time",
            "Good but not perfect. Small drift between clips",
          ],
        },
        {
          id: "c4",
          label: "Cost per video",
          cells: ["$0.05 to $0.15", "$0.50 to $1.20", "$1.50 to $3.00"],
        },
        { id: "c5", label: "Feels like real UGC", cells: ["Least", "Middle", "Most"] },
        {
          id: "c6",
          label: "Best for",
          cells: [
            "Testing cheaply, high volume",
            "The default choice",
            "When you want it to actually pass as a person",
          ],
        },
      ],
      footnote:
        "For a reaction to an app demo, the AI avatar route is the sweet spot. You get a consistent face, the app fills most of the frame anyway, and the cost stays sane at volume. Faceless is what I would run for the first two weeks to find which hooks work, before spending anything on avatars. If you want per account characters, each one is a different avatar, different voice, different name and bio. That is the variation layer doing its job.",
    },
  });

  // ── Q3: the video structure ────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "Answering your three questions",
      title: "Reaction videos to app demos",
      body: doc(
        p("The structure I would build to, per video:"),
        orderedList([
          "Hook, 0 to 3 seconds. Character reacts before the viewer knows what to. “wait, this app just did what”",
          "Reveal, 3 to 8 seconds. Cut to app screen recording, the specific moment that is impressive.",
          "Reaction, 8 to 20 seconds. Character talks over or beside the demo, one benefit, one objection handled.",
          "CTA, last 3 seconds. Soft, not salesy. Name of the app, or “link in bio”.",
        ]),
        p(
          "The system needs a library of app screen recordings to pull from. That is the one input I cannot generate. You record 10 to 15 clips of the app doing interesting things once, and the pipeline recombines them across hundreds of videos with different hooks and reactions. Recording those is maybe an hour of your time, one time.",
        ),
      ),
    },
  });

  // ── Scope of work ──────────────────────────────────────────────
  blocks.push({
    type: "SCOPE_OF_WORK",
    data: {
      eyebrow: "Scope of work",
      title: "What gets built",
      intro: "Everything gets built in accounts in your name. You own it.",
      phases: [
        {
          id: "ph1",
          name: "Research and format",
          summary: "Find what is already working before writing anything.",
          deliverables: [
            {
              id: "d1",
              name: "Niche trend breakdown",
              description:
                "Top performing videos in your niche pulled and reduced to a written format breakdown: what the hooks are, how long they run, how they are structured.",
              acceptanceCriteria:
                "Delivered as a written breakdown you can read, argue with, and keep.",
            },
            {
              id: "d2",
              name: "Script generation",
              description:
                "Scripts written to those winning formats rather than to a generic template. One batch of 20 on Pilot, on a schedule from Core up.",
            },
          ],
        },
        {
          id: "ph2",
          name: "Character and assets",
          summary: "Signed off before anything auto posts.",
          deliverables: [
            {
              id: "d3",
              name: "Character and voice",
              description:
                "One consistent character per account: locked look, locked voice, own name and bio. Faceless on Pilot, AI avatar from Core up.",
              acceptanceCriteria:
                "You sign off on the character and the first 5 videos before anything auto posts.",
            },
            {
              id: "d4",
              name: "Screen recording library",
              description:
                "Your 10 to 15 app demo clips catalogued so the pipeline rotates them across hundreds of videos instead of reusing the same one.",
            },
          ],
        },
        {
          id: "ph3",
          name: "Pipeline and posting",
          summary: "The part that runs without you.",
          deliverables: [
            {
              id: "d5",
              name: "Video assembly",
              description:
                "Avatar plus app demo, split screen or picture in picture, captions burned in, music under.",
            },
            {
              id: "d6",
              name: "Scheduled posting",
              description:
                "Direct to TikTok via the official Content Posting API, 3 per day at times you set.",
              acceptanceCriteria: "A test post lands on the account at the scheduled time.",
            },
            {
              id: "d7",
              name: "Content queue",
              description:
                "A sheet showing what is about to go out, so you can kill anything you do not like before it posts.",
            },
          ],
        },
        {
          id: "ph4",
          name: "Measurement and handover",
          summary: "So you can see what is working and run it yourself.",
          deliverables: [
            {
              id: "d8",
              name: "Performance log",
              description:
                "Views, likes and saves pulled back in, so you can see which hook won rather than guessing.",
            },
            {
              id: "d9",
              name: "Handover",
              description:
                "Walkthrough video and docs, everything in accounts in your name. 7 days of fixes on Pilot, 14 on Core, 30 on Scale.",
            },
          ],
        },
      ],
      outOfScope: [
        "Creating or warming the TikTok accounts themselves",
        "Phone numbers, emails, or proxies for multi account",
        "App store listing, landing page, or link in bio setup",
        "Paid ads or Spark Ads",
        "Ongoing management after handover. If you want me running it monthly, I can quote that separately",
      ],
      clientResponsibilities: [
        "10 to 15 screen recordings of your app doing interesting things. One hour of your time, one time",
        "App name, what it does, who it is for, and the one thing about it people react to",
        "TikTok account or accounts, already created and ideally a few weeks old",
        "Confirmation of the niche. On our call you mentioned manifestations and affirmations. If the app is in that space, say so, because it changes the trend research completely",
        "Sign off on the character and the first 5 videos before anything auto posts",
      ],
      assumptions: [
        "Target output is 3 posts per day per account",
        "The content format is reaction videos to demos of your app",
        "You own or control the app being demoed, and can record it",
      ],
    },
  });

  // ── Packages ───────────────────────────────────────────────────
  blocks.push({
    type: "PRICING_TIERS",
    data: {
      eyebrow: "Packages",
      title: "Three ways to run this",
      intro:
        "Prices exclude the third party running costs below, which you pay directly to those vendors. Nothing there is marked up by me.",
      selectable: true,
      footnote:
        "Priced below my usual rate because I want the contract on my Upwork record. That is the trade and I am fine with it.",
      tiers: [
        {
          key: "pilot",
          name: "Pilot",
          summary:
            "Prove the format before spending on it. A two week test, not a system: if 2 of the 20 pop, you know the format works and we build the real thing.",
          priceMinor: 250_00,
          billingPeriod: "ONE_TIME",
          isRecommended: true,
          badge: "Start here",
          ctaLabel: "Select Pilot",
          features: [
            {
              id: "p1",
              label: "Trend research on your niche, done once",
              included: true,
              detail: "Delivered as a written format breakdown of what is working",
            },
            {
              id: "p2",
              label: "Script generation from those winning formats",
              included: true,
              detail: "20 scripts",
            },
            {
              id: "p3",
              label: "Faceless video assembly",
              included: true,
              detail: "App screen recording, voiceover, burned in captions, background music",
            },
            { id: "p4", label: "20 videos delivered as files", included: true },
            { id: "p5", label: "Manual posting, you upload them yourself", included: true },
            {
              id: "p6",
              label: "Google Sheet tracking what was posted and how it performed",
              included: true,
            },
            { id: "p7", label: "7 days of fixes", included: true },
            { id: "p8", label: "Automation and scheduler", included: false, detail: "Neither" },
            { id: "p9", label: "AI avatar character", included: false, detail: "Faceless only" },
            { id: "p10", label: "Tuning rounds", included: false, detail: "None included" },
          ],
        },
        {
          key: "core",
          name: "Core",
          summary: "The actual machine, one account.",
          priceMinor: 450_00,
          billingPeriod: "ONE_TIME",
          isRecommended: false,
          ctaLabel: "Select Core",
          features: [
            { id: "co1", label: "Everything in Pilot", included: true },
            {
              id: "co2",
              label: "Automated trend scraping, runs weekly",
              included: true,
              detail: "Pulls top performing videos in your niche and extracts the format",
            },
            {
              id: "co3",
              label: "Script generation on a schedule, not a one off batch",
              included: true,
            },
            {
              id: "co4",
              label: "One consistent AI avatar character",
              included: true,
              detail: "Voice locked, look locked",
            },
            {
              id: "co5",
              label: "Automatic video assembly",
              included: true,
              detail: "Avatar plus app demo, split screen or picture in picture",
            },
            {
              id: "co6",
              label: "Auto captions, styled to match what is working in the niche",
              included: true,
            },
            {
              id: "co7",
              label: "Direct posting to TikTok via the official Content Posting API",
              included: true,
              detail: "3 per day at times you set",
            },
            {
              id: "co8",
              label: "Content queue in a sheet",
              included: true,
              detail: "See what is about to go out and kill anything you do not like",
            },
            {
              id: "co9",
              label: "Performance log pulled back in",
              included: true,
              detail: "Views, likes, saves, so you can see which hook won",
            },
            { id: "co10", label: "14 days of fixes", included: true },
            {
              id: "co11",
              label: "Tuning rounds",
              included: true,
              detail: "1 round after we see real numbers",
            },
            { id: "co12", label: "Multiple accounts", included: false, detail: "One account" },
            { id: "co13", label: "Variation engine", included: false },
            { id: "co14", label: "Hook A/B testing", included: false },
            { id: "co15", label: "Auto pause on suppression", included: false },
          ],
        },
        {
          key: "scale",
          name: "Scale",
          summary:
            "Worth it once you have one account that is already working. Copying a losing formula to five accounts just loses five times faster.",
          priceMinor: 600_00,
          billingPeriod: "ONE_TIME",
          isRecommended: false,
          ctaLabel: "Select Scale",
          features: [
            { id: "s1", label: "Everything in Core", included: true },
            {
              id: "s2",
              label: "Up to 5 accounts",
              included: true,
              detail: "Each with its own character, voice, name, and posting schedule",
            },
            {
              id: "s3",
              label: "Variation engine so no two accounts post the same asset",
              included: true,
              detail: "Different hook, different voice, different caption, different music per account",
            },
            {
              id: "s4",
              label: "Hook A/B testing",
              included: true,
              detail: "Same body, different opener, so you learn which first three seconds works",
            },
            {
              id: "s5",
              label: "Screen recording library management",
              included: true,
              detail: "The system rotates demo clips instead of reusing the same one",
            },
            {
              id: "s6",
              label: "Cross account dashboard",
              included: true,
              detail: "Which account, which character, which hook is winning",
            },
            {
              id: "s7",
              label: "Auto pause",
              included: true,
              detail:
                "If an account's views collapse, the system stops posting to it and tells you, instead of burning content into a suppressed account",
            },
            { id: "s8", label: "30 days of support", included: true },
            { id: "s9", label: "Tuning rounds", included: true, detail: "2 rounds" },
          ],
        },
      ],
    },
  });

  // ── Build cost matrix ──────────────────────────────────────────
  blocks.push({
    type: "COMPARISON_TABLE",
    data: {
      eyebrow: "Packages",
      title: "The three side by side",
      rowHeaderLabel: "What you get",
      columns: [
        { id: "pilot", label: "Pilot", note: "Start here", emphasis: true },
        { id: "core", label: "Core" },
        { id: "scale", label: "Scale" },
      ],
      rows: [
        {
          id: "b1",
          label: "Trend research",
          cells: ["One time, manual", "Automated weekly", "Automated weekly"],
        },
        {
          id: "b2",
          label: "Script generation",
          cells: ["20 scripts, one batch", "Ongoing", "Ongoing, per account"],
        },
        { id: "b3", label: "Character", cells: ["Faceless", "1 AI avatar", "Up to 5 avatars"] },
        { id: "b4", label: "Video assembly", cells: ["Semi manual", "Automated", "Automated"] },
        {
          id: "b5",
          label: "Captions",
          cells: ["Included", "Included", "Included, style tested"],
        },
        {
          id: "b6",
          label: "Posting",
          cells: ["You post manually", "Auto, 1 account", "Auto, up to 5 accounts"],
        },
        { id: "b7", label: "Variation engine", cells: ["No", "No", "Yes"] },
        { id: "b8", label: "Hook A/B testing", cells: ["No", "No", "Yes"] },
        {
          id: "b9",
          label: "Performance tracking",
          cells: ["Manual sheet", "Auto pulled", "Cross account dashboard"],
        },
        { id: "b10", label: "Auto pause on suppression", cells: ["No", "No", "Yes"] },
        { id: "b11", label: "Support", cells: ["7 days", "14 days", "30 days"] },
        { id: "b12", label: "Tuning rounds", cells: ["0", "1", "2"] },
        { id: "b13", label: "Price", cells: ["$250", "$450", "$600"], emphasis: true },
      ],
    },
  });

  // ── Add-on ─────────────────────────────────────────────────────
  blocks.push({
    type: "ADD_ONS",
    data: {
      eyebrow: "Optional",
      title: "Add-on",
      intro: "Available after the Scale build, not before.",
      addOns: [
        {
          key: "extra-account",
          name: "Additional TikTok account, 6 to 10",
          description:
            "Each additional account gets its own character, voice, name and posting schedule, and joins the variation engine so it never duplicates another account's asset. Priced per account. Note that each one also needs its own phone number, email and warmed account, which is on you rather than on the build.",
          priceMinor: 40_00,
          billingPeriod: "ONE_TIME",
          selectedByDefault: false,
        },
      ],
    },
  });

  // ── Third party running costs ──────────────────────────────────
  // Figures are the sender's own, taken verbatim from the source document, so
  // they carry aiGenerated: false. The provenance gate exists to stop
  // AI-guessed vendor pricing reaching a client, not to re-litigate numbers a
  // human wrote down.
  const verified = new Date().toISOString();
  blocks.push({
    type: "SERVICE_COSTS",
    data: {
      eyebrow: "Running costs",
      title: "What the tooling actually costs",
      intro:
        "You pay these directly to the vendors, not to me. Nothing here is marked up. The figures below are the Core setup on one account with an AI avatar, at 90 videos a month, which is the configuration I would actually run. Where a free path is good enough I have taken it.",
      showTotals: true,
      footnote:
        "Pilot on the faceless path is about $25 all in. Five accounts with avatars is $150 to $180. The scenario table below has the rest. The free paths here are not compromises — self hosted ffmpeg and n8n are what I would use at this volume regardless.",
      rows: [
        {
          id: "sc1",
          vendor: "TikTok Creative Center",
          purpose: "Trend scraping",
          planName: "Free",
          vendorUrl: "https://ads.tiktok.com/business/creativecenter",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes:
            "Free and manual. Apify's TikTok scraper automates it for about $30 per month if you want that later.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc2",
          vendor: "Claude API",
          purpose: "Script generation",
          planName: "Pay as you go",
          vendorUrl: "https://www.anthropic.com/pricing",
          monthlyCostMinor: 5_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes:
            "Roughly $3 to $8 per month at this volume. The free tier works, but the API is worth it for reliability on a schedule.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc3",
          vendor: "ElevenLabs",
          purpose: "Voice",
          planName: "Creator",
          vendorUrl: "https://elevenlabs.io/pricing",
          monthlyCostMinor: 22_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Do not cheap out here. The voice carries it.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc4",
          vendor: "HeyGen",
          purpose: "AI avatar",
          planName: "Creator",
          vendorUrl: "https://www.heygen.com/pricing",
          monthlyCostMinor: 29_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Core and Scale only. Scales to about $89 for 5 characters. Not needed on Pilot.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc5",
          vendor: "ffmpeg",
          purpose: "Video assembly and captions",
          planName: "Self hosted",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes:
            "Free, with Whisper for the caption timing. Creatomate is about $41 and Submagic about $16 if you would rather not self host. I will self host it.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc6",
          vendor: "n8n",
          purpose: "Automation layer",
          planName: "Self hosted",
          vendorUrl: "https://n8n.io/pricing",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Free self hosted is fine at this volume. Cloud is about $24 per month.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc7",
          vendor: "TikTok Content Posting API",
          purpose: "Posting",
          planName: "Free",
          vendorUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes:
            "Free and safer than a third party scheduler. Needs app approval from TikTok, which is the one timeline dependency outside my control.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc8",
          vendor: "Google Drive",
          purpose: "Video file storage",
          planName: "100GB",
          vendorUrl: "https://one.google.com/about/plans",
          monthlyCostMinor: 2_00,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Video files add up fast at 90 a month. Get the $2 plan, do not optimise this.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "sc9",
          vendor: "Google Sheets",
          purpose: "Tracking and content queue",
          planName: "Free",
          monthlyCostMinor: 0,
          setupCostMinor: 0,
          billedTo: "CLIENT",
          notes: "Enough for this. Do not pay for a content tool yet.",
          aiGenerated: false,
          verifiedAt: verified,
        },
      ],
    },
  });

  // ── Monthly cost by setup ──────────────────────────────────────
  blocks.push({
    type: "COMPARISON_TABLE",
    data: {
      eyebrow: "Running costs",
      title: "Realistic monthly spend",
      rowHeaderLabel: "Setup",
      columns: [
        { id: "vol", label: "Volume" },
        { id: "cost", label: "Monthly cost" },
      ],
      rows: [
        {
          id: "m1",
          label: "Pilot, faceless, manual posting",
          cells: ["20 videos, one off", "About $25 total"],
        },
        { id: "m2", label: "Core, 1 account, faceless", cells: ["90 per month", "$28 to $35"] },
        {
          id: "m3",
          label: "Core, 1 account, AI avatar",
          cells: ["90 per month", "$55 to $65"],
          emphasis: true,
        },
        {
          id: "m4",
          label: "Scale, 3 accounts, AI avatar",
          cells: ["270 per month", "$110 to $130"],
        },
        {
          id: "m5",
          label: "Scale, 5 accounts, AI avatar",
          cells: ["450 per month", "$150 to $180"],
        },
        {
          id: "m6",
          label: "Scale, 5 accounts, fully AI generated",
          cells: ["450 per month", "$700 to $900"],
        },
      ],
      footnote:
        "The jump to fully AI generated video is where costs stop being trivial. I would not go there until an account is already earning.",
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
          id: "tl1",
          vendor: "Trend scraping",
          vendorUrl: "https://ads.tiktok.com/business/creativecenter",
          freeLimit: "TikTok Creative Center, free, manual",
          freeCaveat:
            "Manual means somebody sits and reads it. Fine weekly, painful daily, and it does not feed the pipeline on its own.",
          paidLimit: "Apify TikTok scraper",
          paidPriceNote: "About $30 per month",
          recommendation: "Core and Scale. The free path works, it is just slower.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl2",
          vendor: "Script generation",
          vendorUrl: "https://www.anthropic.com/pricing",
          freeLimit: "Claude or Gemini free tier",
          freeCaveat:
            "Rate limits, and no reliable automation hook. Fine for one batch, not for a schedule.",
          paidLimit: "Claude API",
          paidPriceNote: "Roughly $3 to $8 per month at this volume",
          recommendation: "Worth it for reliability. This is the cheapest line on the list.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl3",
          vendor: "Voice",
          vendorUrl: "https://elevenlabs.io/pricing",
          freeLimit: "Vapi or browser TTS",
          freeCaveat:
            "Quality is poor and it is audible in the first two seconds, which is exactly where you lose the viewer.",
          paidLimit: "ElevenLabs Creator",
          paidPriceNote: "$22 per month",
          recommendation: "Do not cheap out here. The voice carries it.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl4",
          vendor: "AI avatar",
          vendorUrl: "https://www.heygen.com/pricing",
          freeLimit: "None",
          freeCaveat:
            "There is no free path to a consistent avatar. Faceless is the free alternative, and that is a different format rather than a cheaper version of the same one.",
          paidLimit: "HeyGen Creator",
          paidPriceNote: "$29 per month, scaling to about $89 for 5 characters",
          recommendation: "Core and Scale only. Not needed for the Pilot.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl5",
          vendor: "Fully AI generated video",
          vendorUrl: "https://higgsfield.ai/pricing",
          freeLimit: "None",
          freeCaveat: "No free path at all, and the per video cost is the whole story here.",
          paidLimit: "Veo or Higgsfield",
          paidPriceNote: "Roughly $1.50 to $3 per finished video",
          recommendation:
            "Optional upgrade. I would not go there until an account is already earning.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl6",
          vendor: "Video assembly",
          vendorUrl: "https://creatomate.com/pricing",
          freeLimit: "ffmpeg, self hosted, free",
          freeCaveat:
            "Self hosting means it runs on a machine somebody maintains. At this volume that is not a real burden.",
          paidLimit: "Creatomate",
          paidPriceNote: "About $41 per month",
          recommendation: "The free path is fine. I will self host it.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl7",
          vendor: "Captions",
          vendorUrl: "https://www.submagic.co/pricing",
          freeLimit: "ffmpeg plus Whisper, free",
          freeCaveat:
            "Slightly rougher styling than a purpose built tool, and you tune the look once rather than per video.",
          paidLimit: "Submagic",
          paidPriceNote: "$16 per month",
          recommendation: "The free path is fine.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl8",
          vendor: "Automation layer",
          vendorUrl: "https://n8n.io/pricing",
          freeLimit: "n8n self hosted, free",
          freeCaveat: "You maintain the host. Fine at this volume.",
          paidLimit: "n8n Cloud",
          paidPriceNote: "About $24 per month",
          recommendation: "The free path is fine at this volume.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl9",
          vendor: "Posting",
          vendorUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started",
          freeLimit: "TikTok Content Posting API, free",
          freeCaveat:
            "Needs app approval from TikTok, which has been taking anywhere from 2 days to 2 weeks and is outside my control.",
          paidLimit: "Blotato or Postiz",
          paidPriceNote: "About $29 per month",
          recommendation:
            "The official API is free and safer. Use it. The paid scheduler is the fallback if approval stalls.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl10",
          vendor: "Storage",
          vendorUrl: "https://one.google.com/about/plans",
          freeLimit: "Google Drive free tier, 15GB",
          freeCaveat: "15GB fills fast once you are generating 90 videos a month.",
          paidLimit: "Drive 100GB",
          paidPriceNote: "$2 per month",
          recommendation: "Get the $2 plan. This is not worth optimising.",
          aiGenerated: false,
          verifiedAt: verified,
        },
        {
          id: "tl11",
          vendor: "Tracking",
          freeLimit: "Google Sheets, free",
          freeCaveat: "No meaningful limit at this volume.",
          recommendation: "Sheets is enough.",
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
        "Working days. Pilot is 4 to 5, Core is 8 to 10, Scale is 12 to 14. The track below shows the Scale build. One dependency sits outside my control: TikTok's Content Posting API needs app approval, and that has been taking anywhere from 2 days to 2 weeks. I will submit it on day one so it runs in parallel. If it stalls, the fallback is a third party scheduler at about $29 a month, which works fine but is a running cost instead of free.",
      showGantt: true,
      showAbsoluteDates: false,
      milestones: [
        {
          id: "t1",
          name: "Research and format breakdown",
          description:
            "Niche research and format breakdown. You record the app demo clips in this window.",
          startOffsetDays: 0,
          durationDays: 2,
          deliverables: ["Format breakdown", "10 to 15 app demo clips from you"],
          isPaymentMilestone: false,
        },
        {
          id: "t2",
          name: "Character and first 5 videos",
          description: "Character and voice built, first 5 videos for your approval.",
          startOffsetDays: 2,
          durationDays: 2,
          deliverables: ["Character and voice", "First 5 videos for sign off"],
          isPaymentMilestone: false,
        },
        {
          id: "t3",
          name: "Pipeline build",
          description: "Scraping, scripting, assembly and captions wired together.",
          startOffsetDays: 4,
          durationDays: 4,
          deliverables: ["Trend scraping", "Script generation", "Assembly", "Captions"],
          isPaymentMilestone: false,
        },
        {
          id: "t4",
          name: "TikTok API and posting tests",
          description: "Content Posting API connection and scheduled posting tests.",
          startOffsetDays: 8,
          durationDays: 2,
          deliverables: ["API connection", "Test posts at scheduled times"],
          isPaymentMilestone: false,
        },
        {
          id: "t5",
          name: "Live run and tuning",
          description: "Two week live run, then tuning on real numbers.",
          startOffsetDays: 10,
          durationDays: 2,
          deliverables: ["Live posting at 3 per day", "Tuning on real performance data"],
          isPaymentMilestone: false,
        },
        {
          id: "t6",
          name: "Handover",
          description: "Handover, walkthrough video, docs.",
          startOffsetDays: 12,
          durationDays: 1,
          deliverables: ["Walkthrough video", "Documentation"],
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
        heading("AI content labeling"),
        p(
          "TikTok requires AI generated content to be disclosed, and it auto detects a lot of it anyway via C2PA metadata. Labeled AI content is not banned and does not get automatically suppressed, but it does change how some viewers respond. I will build the label in by default. Hiding it is not worth the account.",
        ),
        heading("The duplicate problem is the whole game"),
        p(
          "Most people who try multi account UGC fail here. They generate 90 videos, blast them to 10 accounts, get nothing, and conclude AI content does not work. It was the duplication. The variation engine in Scale exists specifically for this and it is the main reason Scale costs more than Core.",
        ),
        heading("Volume does not fix a bad hook"),
        p(
          "900 videos a month with a hook nobody stops for is 900 videos nobody watches. The value in this system is not the volume, it is the speed of testing hooks. That is why the A/B testing and performance pull back matter more than the raw output number.",
        ),
        heading("What to expect"),
        p(
          "Most accounts running this format take 2 to 4 weeks and 60 to 100 posts before anything breaks out. Some never do. I cannot promise you a viral account and anyone who does is selling you something. What I can promise is a system that produces consistent, on format, on brand content at 3 per day without your time, and tells you honestly what is working.",
        ),
      ),
    },
  });

  // ── Recommendation ─────────────────────────────────────────────
  blocks.push({
    type: "RICH_TEXT",
    data: {
      eyebrow: "My recommendation",
      title: "Pilot at $250 now, Core at $450 after",
      body: doc(
        p(
          "Start small. That is $700 total across two contracts, but you only spend the second $450 once you have evidence. Run the Pilot for two weeks and only then decide. If the format works you will know from 20 videos. If it does not, you saved $350 and found out fast.",
        ),
        p(
          "If you would rather skip the test and commit, Core at $450 is the right single choice.",
        ),
        p(
          "Scale only makes sense once you have one account that is already working, because copying a losing formula to five accounts just loses five times faster.",
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
      paymentTerms: "Handled through Upwork, released on submission.",
      body: doc(
        bold("Payment"),
        p("Handled through Upwork, released on submission."),
        p(
          "Priced below my usual rate because I want the contract on my Upwork record. That is the trade and I am fine with it.",
        ),
        bold("Ownership"),
        p(
          "Everything gets built in accounts in your name. You own it, and nothing breaks if we stop working together.",
        ),
        bold("Third party costs"),
        p(
          "Tooling costs are billed directly to you by those vendors and are not marked up by me. Estimates assume 3 posts per day per account and will vary with actual usage.",
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
        "Approving this proposal confirms the package, scope and timeline above. The contract and payment both run through Upwork, and the funds are released on submission.",
      externalCtaLabel: "Approve this scope",
      externalLinkLabel: "Open the Upwork contract",
    },
  });

  // ── Validate before anything is persisted ──────────────────────
  // Every block goes through its schema, so an over-length string or a
  // comparison row with a missing cell fails here rather than shipping a
  // shifted table to a client. Parsed output is what gets stored, so defaults
  // are applied consistently in the row and in the snapshot.
  const parsed = blocks.map((b) => ({ type: b.type, data: parseBlockData(b.type, b.data) }));

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
          validUntil: new Date(VALID_UNTIL),
          // Payment runs through Upwork, so our own checkout stays off.
          paymentEnabled: false,
          paymentTiming: "NONE",
          agreementMode: "EXTERNAL_UPWORK",
          externalAgreementNote: EXTERNAL_NOTE,
          publicTokenHash: share!.tokenHash,
        },
      });

  await prisma.proposalBlock.createMany({
    data: parsed.map((b, i) => ({
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
    validUntil: VALID_UNTIL,
    projectStartDate: null,
    paymentEnabled: false,
    paymentTiming: "NONE",
    depositPercent: null,
    agreementMode: "EXTERNAL_UPWORK",
    externalAgreementUrl: null,
    externalAgreementNote: EXTERNAL_NOTE,
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
    blocks: parsed.map((b, i) => ({
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

  const version = await prisma.proposalVersion.create({
    data: {
      proposalId: proposal.id,
      versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
      snapshot: snapshot as object,
      contentHash: computeContentHash(snapshot),
    },
  });

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

  const origin = process.env.APP_URL ?? "http://localhost:3000";

  console.log(`\nProposal: ${TITLE}`);
  console.log(`  id           ${proposal.id}`);
  console.log(`  client       ${client.company} (reused)`);
  console.log(`  blocks       ${parsed.length}`);
  console.log(`  version      v${version.versionNumber}`);
  console.log(`  contentHash  ${version.contentHash}`);
  if (share) {
    console.log(`\n  Share link:  ${origin}/p/${share.token}`);
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
