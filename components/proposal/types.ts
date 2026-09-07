import type { ProposalSnapshot } from "@/lib/versioning/snapshot";

/** Everything a block needs about the document it lives in. */
export interface DocContext {
  snapshot: ProposalSnapshot;
  /** True when rendering for PDF capture. Disables anything interactive. */
  printMode: boolean;
  locale: string;
}

export function formatDate(iso: string | null, locale = "en-US"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
