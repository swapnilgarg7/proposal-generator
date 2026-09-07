import { prisma } from "@/lib/db";
import { computeEventHash } from "@/lib/versioning/snapshot";
import type { ProposalEventType } from "@/lib/generated/prisma/enums";

/**
 * Appends to a proposal's hash-chained audit trail.
 *
 * Each event commits sha256(previousHash + canonicalJson(payload)), so altering
 * or deleting any event breaks every subsequent link. That turns the trail from
 * "a table we control" into something tamper-evident, which is the difference
 * that matters if a signature is ever disputed.
 *
 * Serialised per proposal inside a transaction: two concurrent appends reading
 * the same tail would otherwise fork the chain.
 */
export async function recordEvent(input: {
  proposalId: string;
  type: ProposalEventType;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { proposalId, type, meta, ip, userAgent } = input;

  return prisma.$transaction(async (tx) => {
    // Lock the proposal row so concurrent appends serialise behind it.
    await tx.$queryRaw`SELECT id FROM proposals WHERE id = ${proposalId} FOR UPDATE`;

    const previous = await tx.proposalEvent.findFirst({
      where: { proposalId },
      orderBy: { at: "desc" },
      select: { eventHash: true },
    });

    const at = new Date();
    const payload = { type, at: at.toISOString(), meta };

    return tx.proposalEvent.create({
      data: {
        proposalId,
        type,
        meta: meta as object | undefined,
        ip: ip ?? undefined,
        userAgent: userAgent ?? undefined,
        at,
        prevEventHash: previous?.eventHash ?? null,
        eventHash: computeEventHash(previous?.eventHash ?? null, payload),
      },
    });
  });
}
