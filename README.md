# Sorvex Proposals

Proposal, e-signature and payment platform for **SorvexAI**. Clients open a tokenised link, pick a
pricing tier, e-sign, and optionally pay — without creating an account.

Single-tenant in practice, multi-tenant in schema: only allowlisted addresses can log in and there is
no signup route, but every row carries `organizationId` so opening it up later is a flag, not a rewrite.

See [`plan.md`](./plan.md) for the full architecture and phase plan.

---

## Status

| Phase | State |
|---|---|
| 0 — Foundation | Done, except Supabase provisioning |
| 1 — Document model & renderer | Done |
| 2 — Editor | Not started |
| 3 — Agency blocks | Renderers done; editors not started |
| 4 — Public link, e-sign, PDF, email | Not started |
| 5 — Payments | Not started |
| 6 — AI generation | Not started |

**Blocked on:** a Supabase project. Migrations, seeding and auth cannot run without it. Everything
built so far runs and is tested without it — see the preview routes below.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 48 tests, no database needed
npm run typecheck
```

Preview routes render the real `ProposalRenderer` against a realistic fixture:

| Route | Shows |
|---|---|
| `/preview` | Dark theme, tier selection interactive |
| `/preview?theme=light` | Light theme |
| `/preview?print=1` | Print/PDF mode — forces light, disables interaction |
| `/preview?agreement=upwork` | External-agreement branch (contract signed on Upwork) |

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in:
   - **`DATABASE_URL`** — Settings → Database → Connection string → **Transaction pooler** (port `6543`).
   - **`DIRECT_URL`** — the same page's **Direct connection** (port `5432`).
     Migrations must use this. Over the transaction pooler `prisma migrate` hangs silently rather than
     erroring, which is a miserable thing to debug.
   - **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — Settings → API.
3. `npm run db:migrate && npm run db:seed`

## AI provider

`AI_PROVIDER` selects the implementation:

| Value | Behaviour |
|---|---|
| `local-cli` | Shells out to Claude Code on this machine, using your Max plan. **Hard-gated: the app refuses to boot with this set when `NODE_ENV=production`**, because it needs a local Claude Code session and cannot work on Vercel. |
| `anthropic-api` | Standard API calls. Requires `ANTHROPIC_API_KEY`. This is what runs in production. |
| `disabled` | AI drafting off; everything else works. |

The intended workflow is **draft locally, serve globally**: generate on your Max plan, and the same
Supabase row is instantly live on the client link.

---

## Conventions

Matched to `sorvex-landing` so this reads as the same codebase family:

- **No `src/` directory.** `@/*` maps to the project root.
- **Tailwind v4, CSS-first.** All tokens live in `app/globals.css` under `@theme inline`. There is no
  `tailwind.config` file and adding one would split the source of truth.
- Two token sets: `--color-*` for app chrome (always dark), `--doc-*` for the proposal document
  (themes independently, set via `[data-doc-theme]`).
- Money is **always** an integer in minor units plus a currency code. Never a float, never a formatted
  string in the database.
- Money renders with the **sans** face and tabular figures, never mono — Geist Mono gives the comma a
  full character cell, so `$3,499` comes out as `$3 , 499`.

## Things that will bite you if you change them carelessly

- **`lib/versioning/snapshot.ts`** — canonicalisation and hashing. `JSON.stringify` is not a stable
  hash input: key order follows insertion order and JSONB round-trips reorder it, so signed documents
  would fail their own verification for no visible reason. Changing `toSignable()` changes every hash;
  the golden-file test in `tests/hashing.test.ts` exists to make that impossible to do by accident.
- **`ProposalRenderer` must stay a pure function of a snapshot.** The moment it reads live state, the
  web viewer and the sealed PDF can disagree about what was signed.
- **The public page must render `publishedVersionId`'s snapshot**, never live `ProposalBlock` rows.
  Otherwise a proposal can be edited out from under a client mid-signature.
- **Anything animated needs `data-reveal`.** Scroll-reveal entrance states sit at `opacity: 0`, and
  headless Chromium captures that state — producing a blank PDF.
