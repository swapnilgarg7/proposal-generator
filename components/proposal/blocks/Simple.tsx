import type {
  blueprintOfferBlockSchema,
  paymentBlockSchema,
  richTextBlockSchema,
  termsBlockSchema,
} from "@/lib/blocks/schemas";
import type { z } from "zod";
import type { DocContext } from "@/components/proposal/types";
import { RichText } from "@/components/proposal/RichText";
import { CheckIcon, Eyebrow, Section, SectionHeader, SectionTitle } from "@/components/proposal/primitives";

export function RichTextSection({ data }: { data: z.infer<typeof richTextBlockSchema> }) {
  return (
    <Section>
      {data.eyebrow || data.title ? (
        <header className="mb-8">
          <Eyebrow>{data.eyebrow}</Eyebrow>
          {data.title ? <SectionTitle>{data.title}</SectionTitle> : null}
        </header>
      ) : null}
      <div className="max-w-[46rem]">
        <RichText doc={data.body} />
      </div>
    </Section>
  );
}

export function Terms({ data, ctx }: { data: z.infer<typeof termsBlockSchema>; ctx: DocContext }) {
  const governingLaw = data.governingLaw ?? ctx.snapshot.organization.governingLaw;

  return (
    <Section id="terms">
      <SectionHeader eyebrow={data.eyebrow} title={data.title} />

      <div className="max-w-[46rem]">
        <RichText doc={data.body} className="text-[0.9375rem]" />
      </div>

      {data.paymentTerms || governingLaw ? (
        <dl className="mt-8 grid gap-6 rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-inset)] p-6 sm:grid-cols-2">
          {data.paymentTerms ? (
            <div>
              <dt className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
                Payment terms
              </dt>
              <dd className="text-[0.9375rem] leading-relaxed text-[var(--doc-fg-muted)]">
                {data.paymentTerms}
              </dd>
            </div>
          ) : null}
          {governingLaw ? (
            <div>
              <dt className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-[var(--doc-fg-subtle)]">
                Governing law
              </dt>
              <dd className="text-[0.9375rem] leading-relaxed text-[var(--doc-fg-muted)]">
                {governingLaw}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Section>
  );
}

export function BlueprintOffer({ data }: { data: z.infer<typeof blueprintOfferBlockSchema> }) {
  return (
    <Section tight>
      <div
        className="doc-avoid-break relative overflow-hidden rounded-2xl border p-7 sm:p-10"
        style={{
          borderColor: "color-mix(in srgb, var(--doc-accent) 40%, transparent)",
          background: "color-mix(in srgb, var(--doc-accent) 7%, var(--doc-bg-elevated))",
        }}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <Eyebrow>{data.eyebrow}</Eyebrow>
          {data.valueLabel ? (
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--doc-fg-subtle)] line-through">
              {data.valueLabel}
            </span>
          ) : null}
        </div>

        <SectionTitle className="max-w-[24ch] text-[1.75rem] sm:text-[2rem]">
          {data.title}
        </SectionTitle>

        <p className="mt-4 max-w-[42rem] text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)] sm:text-base">
          {data.body}
        </p>

        {data.bullets.length > 0 ? (
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {data.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-[1.6] text-[var(--doc-fg-muted)]">
                <CheckIcon className="mt-0.5 text-[var(--doc-accent)]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {data.condition ? (
          <p className="mt-6 border-t border-[var(--doc-border)] pt-5 text-[0.875rem] font-medium text-[var(--doc-fg)]">
            {data.condition}
          </p>
        ) : null}
      </div>
    </Section>
  );
}

export function PaymentSection({
  data,
  ctx,
}: {
  data: z.infer<typeof paymentBlockSchema>;
  ctx: DocContext;
}) {
  // The document never states the amount independently: the authoritative
  // figure comes from the selection summary, so copy and charge cannot diverge.
  const { paymentTiming, depositPercent } = ctx.snapshot;

  const timingCopy: Record<string, string> = {
    NONE: "",
    DEPOSIT_BEFORE_SIGN: `A ${depositPercent ?? 0}% deposit is payable before the proposal is signed.`,
    DEPOSIT_AFTER_SIGN: `A ${depositPercent ?? 0}% deposit is payable immediately after signing.`,
    FULL_AFTER_SIGN: "The full amount is payable on signing.",
  };

  return (
    <Section id="payment" tight>
      <SectionHeader eyebrow={data.eyebrow} title={data.title} intro={data.intro} />
      <div className="doc-avoid-break rounded-2xl border border-[var(--doc-border)] bg-[var(--doc-bg-elevated)] p-6 sm:p-8">
        <p className="text-[0.9375rem] leading-[1.75] text-[var(--doc-fg-muted)]">
          {timingCopy[paymentTiming]}
        </p>
        {data.note ? (
          <p className="mt-4 border-t border-[var(--doc-border)] pt-4 text-[0.875rem] leading-relaxed text-[var(--doc-fg-subtle)]">
            {data.note}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
