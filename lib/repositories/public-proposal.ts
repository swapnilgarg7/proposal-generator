import { prisma } from "@/lib/db";
import { hashShareToken, proposalSnapshotSchema, type ProposalSnapshot } from "@/lib/versioning/snapshot";

/**
 * Resolves a public share token to the snapshot a client should see.
 *
 * Two rules this function exists to enforce:
 *
 *  1. It reads `publishedVersion.snapshot`, NEVER live ProposalBlock rows. If it
 *     read draft content, an edit made while a client had the page open would
 *     change the document out from under them mid-signature.
 *  2. Lookup is by SHA-256 of the token. The token itself is never stored, so a
 *     database read cannot hand over every live proposal link.
 */

export type PublicProposalResult =
  | { ok: true; proposal: PublicProposal }
  | { ok: false; reason: "not_found" | "revoked" | "expired" | "not_published" | "corrupt" };

export interface PublicProposal {
  id: string;
  versionId: string;
  contentHash: string;
  snapshot: ProposalSnapshot;
  status: string;
  requiresPasscode: boolean;
  paymentEnabled: boolean;
  agreementMode: "INLINE_ESIGN" | "EXTERNAL_UPWORK" | "EXTERNAL_OTHER";
  alreadySigned: boolean;
}

export async function getPublicProposalByToken(token: string): Promise<PublicProposalResult> {
  if (!token || token.length > 128) return { ok: false, reason: "not_found" };

  const proposal = await prisma.proposal.findUnique({
    where: { publicTokenHash: hashShareToken(token) },
    include: {
      publishedVersion: true,
      _count: { select: { signatures: true } },
    },
  });

  if (!proposal) return { ok: false, reason: "not_found" };
  if (proposal.revokedAt) return { ok: false, reason: "revoked" };
  if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (!proposal.publishedVersion) return { ok: false, reason: "not_published" };

  // Validate on the way out. A snapshot that no longer parses means the schema
  // moved under a stored document; better a clear error than a half-rendered
  // contract.
  const parsed = proposalSnapshotSchema.safeParse(proposal.publishedVersion.snapshot);
  if (!parsed.success) {
    console.error(
      `Snapshot for proposal ${proposal.id} version ${proposal.publishedVersion.id} failed validation`,
      parsed.error.issues,
    );
    return { ok: false, reason: "corrupt" };
  }

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      versionId: proposal.publishedVersion.id,
      contentHash: proposal.publishedVersion.contentHash,
      snapshot: parsed.data,
      status: proposal.status,
      requiresPasscode: Boolean(proposal.passcodeHash),
      paymentEnabled: proposal.paymentEnabled,
      agreementMode: proposal.agreementMode,
      alreadySigned: proposal._count.signatures > 0,
    },
  };
}
