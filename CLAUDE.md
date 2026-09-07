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

## Verification

```bash
npm run typecheck && npm test && npm run build
```

Then look at `/preview`, `/preview?theme=light`, `/preview?print=1` and `/preview?agreement=upwork` —
a change that typechecks can still make a client-facing document look wrong.
