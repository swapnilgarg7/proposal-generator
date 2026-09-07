# Sorvex Proposals — Proposal, E-Sign & Payment Platform

## Context

Swapnil runs **SorvexAI**, an AI agency selling Discovery / Build ($4,999 per project) / Retainer
($9,999 per month) engagements, with a prospect list of ~5,000 US healthcare and clinic owners already
sitting in `sorvex/leads/`. There is currently **no proposal tooling of any kind** on disk: no SOW
template, no MSA, no e-signature, no payment collection, no PDF generation. The published terms page at
`sorvex-landing/app/terms/page.tsx:69` even promises clients "a separate Master Services Agreement and
Statement of Work" that does not exist.

This builds a PandaDoc-class platform, opinionated for an AI agency's sales motion: a mirrored problem
statement, scoped deliverables, tiered pricing, **transparent third-party infrastructure costs**,
**free-tier vs paid-tier vendor limits**, and a delivery timeline. A client opens a link, picks a tier,
e-signs, and optionally pays, without creating an account.

Constraints:
- **Single-tenant in practice, multi-tenant in schema.** Only Swapnil logs in; signup is closed. Every
  row carries `organizationId` from day one, so opening it up later is a flag, not a rewrite.
- Payment collection is a **per-proposal toggle**, not a global setting.
- **AI drafts proposals** from a short brief and researches the vendor cost tables.
- The public proposal page *is* the pitch. It has to look like it was built by someone who knows their craft.

---

## Decisions locked with the user

| Area | Decision |
|---|---|
| Name | **Sorvex Proposals** |
| AI engine | **Both**, switchable by `AI_PROVIDER`: local Claude Code (your Max plan) and Anthropic API |
| Payments | **Stripe (USD default) + Razorpay (INR)**, chosen per proposal |
| E-signature | **Built in-house** — typed/drawn, audit trail, sealed PDF + certificate page |
| Hosting | **Vercel**, live client links from day one |
| Database | **Supabase** — Postgres + Auth + Storage |
| Free blueprint | **Both** a public lead-magnet page and an in-proposal offer block |
| First milestone | **One real proposal, end to end** — authorable, sendable, signable |
| Problem statement | **Optional block**, placed right after the cover |
| Agreement mode | **Per-proposal toggle**: sign inline, or state the contract is signed on Upwork |
| SOW deliverables | Technical documentation and a recorded video overview are **separate line items** |

---

## Three findings from the architecture review you should read before approving

### 1. The Max-plan AI path needs to change shape (and carries a real caveat)

Anthropic's Agent SDK docs state that third-party developers may not offer claude.ai login or
subscription rate limits *for their products*. Sorvex Proposals is internal and single-user, so you are
not "offering" anything to anyone — but the least ambiguous way to use your Max plan is not the Agent
SDK. It is **Claude Code itself, headless**: the app shells out to `claude -p "<prompt>"
--output-format stream-json` on your machine. That is unambiguously you using your own Claude Code for
your own work.

So the local provider becomes `local-cli` rather than `agent-sdk`, and it is **hard-gated behind
`NODE_ENV !== 'production'`** so it physically cannot be invoked from Vercel. The workflow stays what
you wanted: **draft locally on Max limits, serve globally from Supabase.**

**Flagging honestly:** this is my reading of policy text, not legal advice, and the personal-local-use
case is not addressed explicitly. If it matters to you, a support ticket to Anthropic settles it. The
API-key provider is unambiguous and is what runs in production either way.

### 2. Block content should be JSON-first, not the relational/JSON mix I first drafted

I originally had `PricingTier`, `TierFeature`, `ServiceCost`, `Milestone` as relational tables and
everything else as JSON. That is backwards for a product built on immutable signed snapshots: the
relational half is exactly the half that makes versioning painful, because freezing a version means
deep-copying four tables or letting the snapshot drift from relational truth.

**The clean line is: library relational, document JSON.**
- `ProposalBlock` holds identity and ordering only: `id, proposalId, type, order, data Jsonb, schemaVersion`.
- Every payload — tiers, features, vendor costs, tier limits, milestones — lives in `data`, validated by
  a per-type Zod schema.
- Relational stays only for genuinely reusable cross-proposal library entities (`ServiceCatalog`), which
  you **copy from** into block JSON. They are inputs, not document content.
- Denormalized `selectedTierKey`, `selectedTierAmountMinor`, `currency` columns on `Proposal`, frozen at
  selection time, so dashboards and payments can query without touching JSON.

The payoff: `ProposalVersion.snapshot` is literally the shape the renderer consumes, so there is **one**
render path shared by the web viewer, the PDF, and the email preview. No "render from DB" vs "render
from snapshot" split. That single property is what makes the PDF provably identical to what was signed.

### 3. Two integrity gaps that would have shipped broken

- **`JSON.stringify` is not a stable hash input.** Key order follows insertion order and Prisma JSONB
  round-trips reorder it, so `contentHash` would spuriously change and signed documents would fail their
  own verification. Fix: **RFC 8785 JSON canonicalization** before hashing, with golden-file tests.
- **Typed name + IP does not identify a signer.** It proves only that someone had the link. Fix: an
  **email OTP to the contact address on record** (not one they type) before the signature commits. This
  is the difference between an audit trail that means something and one that does not. It also makes
  Resend a dependency of signing, not a later nice-to-have.

---

## Stack

Matched to your house conventions (`sorvex-landing`, `SorvexLabs-dashboard`) so this reads as the same
codebase family:

- **Next.js 16** App Router · React 19 · TypeScript strict · **npm**
- **No `src/` dir**; `@/*` → project root. Flat `components/` PascalCase. `lib/utils.ts` with `cn()`.
  (Your dashboard uses `src/` and `ANON_KEY`; the landing sites use root-level and `PUBLISHABLE_KEY`.
  Following the landing sites, which are newer.)
- **Tailwind v4, CSS-first** — tokens in `app/globals.css` via `@theme inline`, **no config file**
- **shadcn/ui** for the internal app only. The **public viewer is hand-rolled** to match landing-site craft.
- **framer-motion** for viewer scroll reveals (already a dependency in your landing sites, unused there)
- **Prisma 7** + `@prisma/adapter-pg` + `prisma.config.ts` → Supabase Postgres, cuid PKs, `@@map` snake_case
- **Supabase Auth** (magic link, no signup route, hard email allowlist) + **Supabase Storage** (private buckets)
- **Tiptap** (store **JSON**, not HTML — eliminates the whole sanitization class) · **dnd-kit** · **Zod**
- **Stripe** + **Razorpay** · **Resend + React Email**
- **Vitest** + **Playwright**

### Brand inheritance (verbatim, not approximated)

Copied from `sorvex-landing/app/globals.css`:

```css
--color-background: #0A0A0A;  --color-foreground: #EDEDED;
--color-surface:    #111111;  --color-border:     rgba(255,255,255,0.08);
--color-accent-purple: #8B5CF6;  --color-accent-pink: #EC4899;  --color-accent-blue: #3B82F6;
--color-accent-indigo: #6366F1;  --color-accent-violet: #A855F7;
--gradient-brand: linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #3B82F6 100%);
```

Plus `.text-gradient-brand`, `.glass`, `.border-gradient-brand`, `.glow-purple/.glow-pink`, and the
mobile `backdrop-filter` kill-switch. Fonts **Geist / Geist Mono**, self-hosted (Puppeteer needs
`document.fonts.ready`, or the PDF renders in fallback serif). Logo from `sorvex-landing/public/logo.png`.

**Dual-theme proposals.** Dark is the signature look and the viewer default, but dark documents print
badly and enterprise clients forward PDFs into procurement. Each proposal carries `theme` (`DARK`|`LIGHT`)
and **the PDF always renders light** unless overridden. Both themes built and visually tested from the start.

---

## Data model (Prisma)

```
Organization   legal name, brand, address, tax id, default terms, default currency,
               signature block, payment config
User           supabase auth id, email, name, role (OWNER|MEMBER), organizationId
               ← role lives here for now; a Membership table arrives when person #2 does

Client         company, website, industry, notes, organizationId
Contact        name, email, title, clientId          ← the signer, kept first-class

Proposal       title, clientId, status, currency, theme, validUntil, projectStartDate,
               publicTokenHash (SHA-256 of a 128-bit token), passcodeHash?, expiresAt, revokedAt,
               isTemplate (bool — a template is a proposal, not a table),
               paymentEnabled, paymentProvider, paymentTiming, depositPercent?,
               selectedTierKey?, selectedTierAmountMinor?, publishedVersionId?, organizationId
ProposalBlock  proposalId, order, type, data (Jsonb), schemaVersion, visible   ← draft content
ProposalVersion  immutable snapshot (Jsonb) + contentHash — exactly what was published/signed

Signature      proposalId, versionId, signerName, signerEmail, signerTitle,
               emailVerifiedAt, otpChallengeId, method (TYPED|DRAWN),
               imagePath, strokeData (Jsonb), ip, userAgent,
               consentText, consentVersion, contentHash, documentHash,
               timestampToken (RFC 3161), signedAt
Payment        proposalId, provider, providerPaymentId, amountMinor (Int), currency,
               kind (DEPOSIT|FINAL|FULL), status (…|REFUNDED|DISPUTED), paidAt
               @@unique([provider, providerPaymentId])
PaymentEvent   raw webhook envelope   @@unique([provider, providerEventId])
ProposalEvent  proposalId, type, meta (Jsonb), ip, at, prevEventHash, eventHash  ← hash-chained
AiJob          provider, task, status, inputTokens, outputTokens, costUsd, error  ← usage ledger

ServiceCatalog your reusable vendor cost + deliverable library (relational; copied into blocks)
BlueprintRequest  name, email, company, answers, generatedDocPath, status
```

Integrity rules the schema enforces:
- **Signed documents are immutable.** Edits fork a new version; the signature points at the hash it signed.
- **The public page renders `publishedVersionId`'s snapshot and never reads live `ProposalBlock` rows.**
  Otherwise you could edit a proposal out from under a client mid-signature — the worst bug in this
  product class. Publishing is an explicit action, never a silent autosave side effect, with a
  "draft differs from published" banner in the editor.
- **Idempotency is a unique index, not application logic.** Insert the raw webhook event first; if the
  unique insert throws, return 200 and stop.
- **Money is `amountMinor Int` + `currency`.** Razorpay is paise, Stripe is cents. Never a float.
  Amount and currency freeze at tier selection so a later price edit cannot change what they owe.

### Block types

All of them are Zod-schema'd in `lib/blocks/schemas.ts`. Each costs four surfaces (schema, editor,
web renderer, print CSS), so `TEAM` and `FAQ` are just `RICH_TEXT` rather than dedicated types.

| Block | Renders |
|---|---|
| `COVER` | Client logo + your logo, title, date, validity |
| `PROBLEM_STATEMENT` | **Optional, sits right after the cover.** Mirrors their situation back: pain points, what each is costing them today, evidence and quotes from the discovery call, and the cost of doing nothing. Toggleable per proposal, and the single most AI-generatable block from a discovery brief. |
| `RICH_TEXT` | Intro, exec summary, why-us, case studies, team, FAQ |
| `SCOPE_OF_WORK` | Phases → deliverables → acceptance criteria → **explicit out-of-scope** |
| `PRICING_TIERS` | 2–4 tiers, feature matrix, one flagged recommended, **client-selectable** |
| `ADD_ONS` | Optional line items with checkboxes that move the live total |
| `SERVICE_COSTS` | **Third-party vendor cost table** — pass-through vs included, with a total infra line |
| `TIER_LIMITS` | **Free vs paid limits per vendor** — the limit, what breaks at it, upgrade price |
| `TIMELINE` | Milestones with durations, as a real Gantt track with absolute dates |
| `TERMS` | Governing law, scope carve-outs, payment terms |
| `BLUEPRINT_OFFER` | The free AI blueprint sweetener |
| `PAYMENT` | Rendered only when `paymentEnabled` |
| `SIGNATURE` | Branches on `agreementMode`: signer fields + sign action inline, or an Upwork/external hand-off panel |


### Agreement mode (added during build)

`Proposal.agreementMode` decides where the contract is actually executed:

- **`INLINE_ESIGN`** — the client signs in the document. Produces a `Signature`, a sealed PDF and a
  certificate page.
- **`EXTERNAL_UPWORK`** — the client approves the scope here; the binding contract is an Upwork
  contract. The signature block becomes a three-step hand-off panel with an optional link.
- **`EXTERNAL_OTHER`** — same, for a separate MSA or DocuSign flow.

The external modes deliberately collect **no signature, emit no certificate, and never use the word
"sign"** — the panel states plainly that approving records agreement to the scope but does not itself
create a binding contract. Claiming an e-signature that did not happen would misrepresent the record,
which is precisely the thing the audit trail exists to prevent.

`agreementMode` is inside the content hash, not merely a rendering hint: which instrument a client
agreed to be bound by is part of what they agreed to.

### Scope-of-work defaults

Every generated scope carries a final **Handover & Enablement** phase with technical documentation and
a recorded video overview as their own deliverables, plus training and a supported handover window.
Breaking these out rather than folding them into "delivery" makes the scope read substantially heavier
for work that is being done regardless.

---

## Route map

**Internal (auth-gated)**
```
/                        Dashboard — pipeline value, conversion, activity
/proposals               List, filter by status
/proposals/new           Brief → AI draft, duplicate a template, or blank
/proposals/[id]/edit     dnd-kit block list, expand-in-place editing, Preview tab
/proposals/[id]/share    Link, passcode, expiry, payment toggle, send
/proposals/[id]/activity Audit trail + per-section attention
/clients · /clients/[id] CRM-lite (imports your Apify lead CSVs)
/library                 Service catalog, vendor costs, templates
/settings                Branding, terms, signature, payment providers, AI provider
```

**Public (no auth, `X-Robots-Tag: noindex`, rate-limited, excluded from auth middleware)**
```
/p/[token]               The proposal. The whole pitch.
/p/[token]/sign          OTP → consent → signature capture
/p/[token]/pay           Stripe or Razorpay
/p/[token]/accepted      Confirmation + PDF download
/blueprint               Free AI blueprint lead magnet
/api/webhooks/stripe · /api/webhooks/razorpay · /api/cron/reminders
```

**Separate Vercel project `sorvex-proposals-pdf`** — `puppeteer-core` + `@sparticuz/chromium-min`,
called with a shared secret. Reasoning: `@react-pdf/renderer` is a different layout engine (flexbox
subset, no grid, no Tailwind) and your gradients would not survive, so it would mean two renderers for
one document that drift within a month. Chromium keeps fidelity; a separate project keeps its ~50MB
dependency and cold starts out of your app's function budget, following the two-project precedent
already in `SorvexLabs-dashboard/VERCEL.md`. Behind a `PdfRenderer` interface so swapping to Browserless
later is a three-line change.

---

## Implementation phases

Renderer before editor: the snapshot renderer is the contract every other surface consumes, and building
it first is what guarantees web and PDF cannot diverge. **Checkpoint after Phase 4** — that is your "one
real proposal, end to end" milestone, and I stop for your feedback before continuing.

### Phase 0 — Foundation
Repo per landing-site conventions, `globals.css` copied verbatim, Geist self-hosted. Prisma 7 with
driver adapter and `prisma.config.ts`; `DATABASE_URL` on the pooler (port 6543, transaction mode,
prepared statements disabled) and `DIRECT_URL` direct (5432) for migrations. A raw-SQL migration
enabling RLS with **zero policies** on every Prisma-managed table (deny-by-default for PostgREST, since
your publishable key is in the browser; Prisma's owner role is unaffected). Private Storage buckets,
signed URLs only. `lib/repositories/` taking an `OrgScope`, with raw `prisma` never exported to route
handlers — tenancy leaks come from a forgotten `where`, and this is the only reliable fix.
**Deploy to Vercel on day one.**

### Phase 1 — The document
Zod block schemas. `lib/versioning/snapshot.ts` with `toSignable()` as an explicit projection (includes
everything the signer saw, excludes `updatedAt` and internal notes), RFC 8785 canonicalization, and
`contentHash`. `<ProposalRenderer snapshot mode="web"|"print" />` as a **pure function of a snapshot**,
both themes. Proposals authored by seeded JSON at this stage.
**Done when:** a seeded snapshot renders beautifully in dark, light, and print.

### Phase 2 — Editor
Client/contact/proposal CRUD. dnd-kit block list with expand-in-place editing, Tiptap (JSON), autosave
to draft, and **explicit publish** minting a version. Preview tab renders the real public component.
**Done when:** you author and publish a proposal without touching JSON.

### Phase 3 — The agency blocks
The differentiated content and the most design-sensitive work: `PROBLEM_STATEMENT`, `SCOPE_OF_WORK`,
`PRICING_TIERS`, `ADD_ONS`, `SERVICE_COSTS`, `TIER_LIMITS`, `TIMELINE`. All pricing math (tier + add-ons
+ tax + deposit, minor-unit rounding) in one pure `lib/pricing.ts`, never duplicated into a component.
**Done when:** a full SorvexAI proposal renders with correct totals in both themes.

### Phase 4 — Public link, e-signature, PDF, email  ← **your checkpoint**
`/p/[token]` reading the published snapshot: hashed tokens, passcode, expiry, noindex, sticky nav, scroll
progress, tier selection driving a live total, mobile-perfect. Batched `BLOCK_VIEWED` aggregation (raw
IntersectionObserver events would put a million rows in your DB in a month).
Signing: **email OTP to the contact on record** → versioned consent checkbox → typed or drawn capture
(storing raw stroke data, not just a PNG) → freeze version → canonical hash → sealed PDF with a
**certificate page** (both hashes, signer, how the email was verified, IP, user agent, full UTC timeline,
verbatim consent text) → **RFC 3161 trusted timestamp** from a free TSA, which is the one thing you
cannot fake yourself → immutable in Storage, keyed by `versionId + contentHash`, emailed immediately.
Resend + React Email with SPF/DKIM/DMARC on `sorvexai.com` (without it proposals land in spam and the
product fails *silently*, the worst failure mode for a sales tool).
**Done when:** an incognito browser opens the link, selects a tier, receives an OTP, signs, gets the
sealed PDF by email, and the certificate matches the audit trail exactly.

### Phase 5 — Payments
`paymentTiming` as one policy field (`NONE | DEPOSIT_BEFORE_SIGN | DEPOSIT_AFTER_SIGN | FULL_AFTER_SIGN`)
so acceptance is derived, not branched. A single re-entrant **`evaluateAcceptance(proposalId)`** called
from the signature handler *and* every webhook, wrapped in a transaction with `SELECT … FOR UPDATE` —
idempotent and order-independent by construction, which matters because **webhooks always arrive before
the browser returns from the redirect**. The success page polls; it never mutates.
Stripe: verify `stripe-signature` against the **raw body** (`await req.text()`, never parse first).
Razorpay: verify both the webhook HMAC and the client-handler HMAC, and act only on `payment.captured` —
trusting the client handler alone is the classic Razorpay vulnerability.
**Done when:** both providers complete a test payment and a replayed duplicate webhook changes nothing.

### Phase 6 — AI generation
`lib/ai/types.ts` defines an `AiProvider` over **tasks with a normalized event stream**, not a chat
message array — so both implementations genuinely satisfy it rather than one faking the other's shape:

```ts
type AiEvent =
  | { type: "status"; message: string }
  | { type: "text_delta"; text: string }
  | { type: "artifact"; schema: string; data: unknown }   // Zod-validated
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; message: string; retryable: boolean }
  | { type: "done" };
```

The API provider emits `artifact` via structured outputs; the local CLI provider emits it via a tool
call. Identical streams, so routes and UI never branch on provider. SSE from a `runtime = 'nodejs'`
route with `maxDuration = 300`. Prompt caching with a `cache_control` breakpoint after the stable brand
voice + service catalog prefix, verified via `usage.cache_read_input_tokens`. `AiJob` doubles as the cost
ledger, without which the AI feature is financially opaque.
Capabilities: **brief → full proposal** (including the problem statement, in your voice), **vendor cost
research**, **per-block rewrite**, **blueprint generation**.
**Done when:** a one-paragraph brief produces a coherent, editable, SorvexAI-voiced draft.

### Phase 7 — Analytics, reminders, expiry
Pipeline value, view-to-sign conversion, time-to-sign, per-section attention. **Vercel cron for expiry
reminders and follow-ups** — this is the actual revenue feature in PandaDoc-likes and it is a cron route
plus an email template.

### Phase 8 — Free blueprint lead magnet
Public `/blueprint` form. AI generates a genuinely useful AI-opportunity blueprint, emailed as a PDF,
creating a `BlueprintRequest` **and** a `Client` so the lead lands in your pipeline. Rate-limited and
captcha'd — it is a public, paid AI endpoint. `BLUEPRINT_OFFER` reuses the same generator in proposals.

### Phase 9 — Library, templates, multi-user scaffolding
Duplicate-as-template, service catalog reuse, **import your existing Apify clinic-lead CSVs** into
`Client` records (reusing the `leads` table pattern from `sorvex-landing/app/api/waitlist/route.ts`).
Multi-user path proven behind `ENABLE_SIGNUPS=false`.

### Phase 10 — Hardening and launch
Rate limits, security headers, token entropy audit, Sentry, Supabase PITR **plus a tested restore** and
an off-Supabase export of sealed PDFs, Lighthouse pass, `proposals.sorvexai.com`, live payment keys, and
your own ToS/Privacy for the signing page with a written GDPR lawful basis reconciling erasure against
"keep signed contracts forever."

---

## Testing strategy

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | **Canonical-hash golden files** (load-bearing: an unstable hash silently invalidates signed documents); `lib/pricing.ts` totals, deposits, tax, minor-unit rounding; timeline date math; token entropy |
| Contract | Vitest + Zod | Every AI output schema against recorded fixtures — proves a malformed model response fails loudly instead of writing garbage into a client-facing document |
| Integration | Vitest + test Postgres | **Webhook signature verification against recorded Stripe/Razorpay payloads**, including duplicate delivery and out-of-order sign/pay; tenancy isolation (org A cannot read org B); `evaluateAcceptance` re-entrancy |
| Snapshot | Vitest | Snapshot-render regression — a given snapshot always produces the same output |
| E2E | Playwright | The money path: log in → AI draft → edit → publish → open link in a clean context → select tier → OTP → sign → pay (test mode) → PDF downloads → dashboard shows signed and paid. Negative paths: expired link, wrong passcode, non-allowlisted login, unverified vendor pricing blocked from publish, editing a signed proposal forking a version rather than mutating it |
| Visual | Playwright screenshots | Viewer at mobile/tablet/desktop, dark and light, and the print stylesheet |
| Manual | — | Send yourself a real proposal and sign it from your phone before going live |

CI: typecheck → lint → unit → integration → build → Playwright against the Vercel preview. A separate
Supabase project for preview, with test-mode payment keys per environment — you cannot test signing
flows in production.

---

## Guardrails baked in

- **PDF rendering gets a hard timeout and a page-count sanity bound.** Headless Chromium is a subprocess
  driven by partly AI-generated content; it must fail fast rather than burn an invocation. Same for every
  AI call: bounded `max_tokens`, request timeout, retry cap. **Generate a sealed PDF once and store it
  forever** — never on demand, and always from the frozen snapshot.
- **Animations must be print-gated.** Scroll-reveal entrance states sit at `opacity: 0` when Puppeteer
  captures the page, which renders a blank PDF. Both a `@media print` override and a `?print=1` gate on
  animation init. This is the single most common day-waster in this setup.
- **AI-generated vendor pricing is never shown to a client unverified.** Model pricing knowledge drifts,
  and a wrong number in a cost table is a credibility hit in front of a paying client. Rows are written
  `aiGenerated: true, verifiedAt: null` and publish is blocked while any row is unverified.
- **Secrets never reach the client bundle.** Payment and AI keys are server-only; the public viewer runs
  on a token, not a session. The signed-PDF and signature-image buckets are private, signed-URL only.

**On legal claims:** what this builds is a **simple electronic signature** under eIDAS — admissible and
appropriate for B2B service agreements, but not AdES or QES, and the certificate will say so. For INR
work, typed/drawn signatures are not notified under India's IT Act Second Schedule; their validity rests
on §10A plus evidentiary weight, which is fine for a services proposal, and the First Schedule carve-outs
(negotiable instruments, powers of attorney, trusts, wills, immovable property) get one line in `TERMS`.
Copy should say "electronic signature with a verifiable audit trail," never "legally binding digital
signature."

---

## Scope calls I made, so you can overrule them

**Deferred:** a `Membership` join table (`role` lives on `User`; one row does not need three tables — but
`organizationId` is everywhere from day one, which is the expensive part to retrofit), a `Template` table
(a template is `Proposal.isTemplate`), and a snippet library (premature until you have written ten
proposals and know what actually repeats).

**Kept despite a recommendation to cut:** every block type you specifically asked for. The review
suggested shipping six block types and making the rest rich text, but `SCOPE_OF_WORK`, `SERVICE_COSTS`,
`TIER_LIMITS`, and `TIMELINE` are the four things you named as the reason this product exists, so they
stay first-class. Only `TEAM` and `FAQ` collapse into `RICH_TEXT`.

---

## Open items I need from you (not blocking — placeholders ship, editable in `/settings`)

Nothing on disk contains these, and a proposal is not legally complete without them:

1. **Legal entity name** — is "SorvexAI" registered, or a trading name for something else?
2. **Registered address** and **tax / GST / registration number**
3. **Governing law / jurisdiction** for the terms block
4. **Default payment terms** — net 15/30, deposit percentage
5. Accounts to create when we reach them: **Stripe, Razorpay, Resend**, and optionally an
   `ANTHROPIC_API_KEY` for production AI. Supabase, Vercel, and Cal.com already exist.

One inconsistency worth settling: your contact email appears as `swapnil@sorvexai.com`,
`hello@sorvexai.com`, `aisorvex@gmail.com`, and `sorvexlabs@gmail.com` across the sites. I will seed
`swapnil@sorvexai.com` as canonical unless you say otherwise.

### Two things I could not verify and will confirm during Phase 0

- Whether `?pgbouncer=true` still has meaning under Prisma 7's driver-adapter path (it was a Rust-engine
  flag). What matters functionally is that prepared statements are disabled under transaction pooling;
  getting it wrong produces intermittent `prepared statement "s0" already exists` errors that look like
  ghosts. I will verify against the current docs rather than assume.
- Vercel's exact function size limit at your plan tier before sizing the Chromium bundle.
