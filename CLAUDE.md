# Sorvex Proposals — working notes

Read `README.md` for conventions and `plan.md` for the architecture and phase plan.

## Non-negotiables

- **No `src/` dir**; `@/*` → project root. Flat `components/`, matching `sorvex-landing`.
- **Tailwind v4 CSS-first.** Tokens in `app/globals.css` `@theme inline`. Do not add a
  `tailwind.config` file.
- **Money is integer minor units + currency.** Never a float. All maths goes through `lib/pricing.ts`;
  duplicating a total into a component is how the document ends up showing one number while the
  server charges another.
- **All document content is validated by `lib/blocks/schemas.ts`** before it is persisted or rendered.
  AI output is never trusted raw.
- **Signed documents are immutable.** Edits fork a `ProposalVersion`; never mutate a signed one.
- **Webhook idempotency is a unique index**, not application logic.

## Before touching hashing or the renderer

`lib/versioning/snapshot.ts` and `components/proposal/ProposalRenderer.tsx` are load-bearing for the
legal defensibility of every signature. Run `npm test` and read the reasoning in the file comments
before changing either. The golden-file hash test failing means every previously signed document
needs re-verification, not that the test needs updating.

## Environments and origins

| Environment | Origin |
|---|---|
| Production | `https://proposals.sorvexai.com` |
| Local dev | `http://localhost:3000` (default), `http://localhost:3111` (used during this build) |

**Every one of these must be in Supabase → Authentication → URL Configuration → Redirect URLs**, as
`<origin>/auth/callback`. Supabase does not error on an unlisted redirect — it silently falls back to
the Site URL, and the user lands somewhere wrong with a `?code=` that nothing consumes.

`APP_URL` must match the environment. It is what share links and email links are built from, and those
get stored in records and inboxes where they are painful to correct later.

## Before building anything that embeds an origin

Auth callbacks, magic links, webhooks, CORS, share links, email — ask for the exact production domain
first and state the third-party dashboard settings that must match. These break only after deploy,
because the code is correct and the configuration nobody asked about is wrong.

## Verification

```bash
npm run typecheck && npm test && npm run build
```

Then look at `/preview`, `/preview?theme=light`, `/preview?print=1` and `/preview?agreement=upwork` —
a change that typechecks can still make a client-facing document look wrong.
