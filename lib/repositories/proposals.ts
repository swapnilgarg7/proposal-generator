import { prisma } from "@/lib/db";
import type { OrgScope } from "@/lib/auth";

/**
 * Org-scoped proposal queries.
 *
 * Every function here takes an OrgScope and applies `organizationId` itself.
 * Route handlers and components must go through this module rather than
 * importing `prisma` directly: multi-tenant leaks come from a single forgotten
 * `where` clause, and centralising the filter is the only reliable fix.
 */

export async function listProposals(scope: OrgScope, opts: { limit?: number } = {}) {
  return prisma.proposal.findMany({
    where: { organizationId: scope.organizationId, isTemplate: false },
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 50,
    include: {
      client: { select: { company: true } },
      contact: { select: { name: true, email: true } },
      _count: { select: { signatures: true, events: true } },
    },
  });
}

export async function getProposal(scope: OrgScope, id: string) {
  // The organizationId in the where clause is what stops an id from another
  // tenant resolving. Never look up by id alone.
  return prisma.proposal.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      client: true,
      contact: true,
      blocks: { orderBy: { order: "asc" } },
      publishedVersion: true,
      signatures: true,
      payments: true,
    },
  });
}

export interface DashboardStats {
  total: number;
  drafts: number;
  awaitingResponse: number;
  signed: number;
  pipelineValueMinor: number;
  signedValueMinor: number;
  currency: string;
  viewToSignRate: number | null;
}

export async function getDashboardStats(scope: OrgScope): Promise<DashboardStats> {
  const where = { organizationId: scope.organizationId, isTemplate: false };

  const [proposals, org] = await Promise.all([
    prisma.proposal.findMany({
      where,
      select: { status: true, totalAmountMinor: true, selectedTierAmountMinor: true, currency: true },
    }),
    prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { defaultCurrency: true },
    }),
  ]);

  const OUT_FOR_RESPONSE = new Set(["SENT", "VIEWED", "TIER_SELECTED"]);
  const CLOSED_WON = new Set(["SIGNED", "AWAITING_PAYMENT", "ACCEPTED"]);

  let pipelineValueMinor = 0;
  let signedValueMinor = 0;
  let drafts = 0;
  let awaitingResponse = 0;
  let signed = 0;
  let everViewed = 0;

  for (const p of proposals) {
    const value = p.totalAmountMinor ?? p.selectedTierAmountMinor ?? 0;

    if (p.status === "DRAFT") drafts++;
    if (OUT_FOR_RESPONSE.has(p.status)) {
      awaitingResponse++;
      // Pipeline is work that is genuinely still in play — not drafts sitting
      // on our side, and not deals already closed.
      pipelineValueMinor += value;
    }
    if (CLOSED_WON.has(p.status)) {
      signed++;
      signedValueMinor += value;
    }
    if (p.status !== "DRAFT") everViewed++;
  }

  return {
    total: proposals.length,
    drafts,
    awaitingResponse,
    signed,
    pipelineValueMinor,
    signedValueMinor,
    currency: org?.defaultCurrency ?? "USD",
    // Null rather than 0 when nothing has gone out: "0%" would imply failure
    // where the honest answer is "no data yet".
    viewToSignRate: everViewed > 0 ? signed / everViewed : null,
  };
}

export async function getRecentActivity(scope: OrgScope, limit = 12) {
  return prisma.proposalEvent.findMany({
    where: { proposal: { organizationId: scope.organizationId } },
    orderBy: { at: "desc" },
    take: limit,
    include: { proposal: { select: { id: true, title: true, client: { select: { company: true } } } } },
  });
}
