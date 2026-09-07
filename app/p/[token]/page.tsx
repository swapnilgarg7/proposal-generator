import { headers } from "next/headers";
import type { Metadata } from "next";
import { ProposalRenderer } from "@/components/proposal/ProposalRenderer";
import { getPublicProposalByToken } from "@/lib/repositories/public-proposal";
import { recordEvent } from "@/lib/repositories/events";
import { ProposalUnavailable } from "@/components/proposal/ProposalUnavailable";

/**
 * The public proposal page.
 *
 * No authentication: access is the token itself. Never statically rendered, and
 * never indexed — see the noindex metadata below and the X-Robots-Tag header in
 * middleware.ts.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicProposalByToken(token);

  if (!result.ok) {
    return <ProposalUnavailable reason={result.reason} />;
  }

  const { proposal } = result;

  // Record the view. Deliberately not awaited into the render path's critical
  // section, and deliberately swallowed on failure: an audit-log write must
  // never be the reason a client cannot read their proposal.
  const h = await headers();
  void recordEvent({
    proposalId: proposal.id,
    type: "VIEWED",
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
    meta: { versionId: proposal.versionId },
  }).catch((e) => console.error("Failed to record VIEWED event", e));

  return (
    <ProposalRenderer
      snapshot={proposal.snapshot}
      mode="web"
      interactive={!proposal.alreadySigned}
      locale="en-US"
    />
  );
}
