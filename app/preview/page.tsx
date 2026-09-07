import { demoProposal } from "@/lib/fixtures/demo-proposal";
import { ProposalRenderer } from "@/components/proposal/ProposalRenderer";
import type { ProposalSnapshot } from "@/lib/versioning/snapshot";

/**
 * Renderer development harness.
 *
 * Renders the demo fixture through the real ProposalRenderer, so what appears
 * here is exactly what a client would see. Query params:
 *   ?theme=light|dark        document theme
 *   ?print=1                 print/PDF mode (forces light, disables interaction)
 *   ?agreement=upwork        exercise the external-agreement branch
 */
export const dynamic = "force-dynamic";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const printMode = first("print") === "1";
  const themeParam = first("theme");
  const agreement = first("agreement");

  const snapshot: ProposalSnapshot = {
    ...demoProposal,
    theme: themeParam === "light" ? "LIGHT" : themeParam === "dark" ? "DARK" : demoProposal.theme,
    ...(agreement === "upwork"
      ? {
          agreementMode: "EXTERNAL_UPWORK" as const,
          externalAgreementUrl: "https://www.upwork.com/",
          externalAgreementNote:
            "The Upwork contract will mirror the scope and milestones set out above exactly. Nothing changes between this document and that contract.",
        }
      : {}),
  };

  return (
    <ProposalRenderer
      snapshot={snapshot}
      mode={printMode ? "print" : "web"}
      interactive={!printMode}
      locale="en-US"
    />
  );
}
