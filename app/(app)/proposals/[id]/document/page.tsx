import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOrgScope } from "@/lib/auth";
import { getProposal } from "@/lib/repositories/proposals";
import { proposalSnapshotSchema } from "@/lib/versioning/snapshot";
import { ProposalRenderer } from "@/components/proposal/ProposalRenderer";

export const metadata: Metadata = { title: "Document" };
export const dynamic = "force-dynamic";

/**
 * The published document, rendered internally.
 *
 * Exists so you can check what a client would see without minting a share
 * token — the token is shown once and issuing a throwaway one to preview the
 * document would kill the URL already sitting in the client's inbox.
 *
 * Interaction is off: tier selection here would be the sender choosing on the
 * client's behalf, and this page must not be able to alter what the client is
 * being asked to agree to.
 */
export default async function ProposalDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await requireOrgScope();

  const proposal = await getProposal(scope, id);
  if (!proposal?.publishedVersion) notFound();

  const parsed = proposalSnapshotSchema.safeParse(proposal.publishedVersion.snapshot);
  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <Link href={`/proposals/${id}`} className="text-sm text-white/45 hover:text-white/70">
          ← Back
        </Link>
        <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-5">
          <p className="font-medium text-red-200">This snapshot no longer validates.</p>
          <p className="mt-2 text-sm text-white/60">
            The block schema has moved since this version was published, so the client link is
            serving an error page too. Publishing a new version regenerates the snapshot against
            the current schema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/proposals/${id}`} className="text-sm text-white/45 hover:text-white/70">
          ← Back to proposal
        </Link>
        <p className="text-sm text-white/40">
          Read-only preview of v{proposal.publishedVersion.versionNumber}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08]">
        <ProposalRenderer snapshot={parsed.data} mode="web" interactive={false} locale="en-US" />
      </div>
    </div>
  );
}
