import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { computeEventHash, hashShareToken } from "@/lib/versioning/snapshot";
import { computeTotals } from "@/lib/pricing";
import type { AddOnsBlock, PricingTiersBlock } from "@/lib/blocks/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ProposalEventType } from "@/lib/generated/prisma/enums";

/**
 * Acceptance: the client approving or signing a proposal.
 *
 * Two paths, and the difference is deliberate and legal, not cosmetic:
 *
 *  - INLINE_ESIGN produces a `Signature` row with a consent record, an audit
 *    trail and the hash of the exact document version signed.
 *  - EXTERNAL_UPWORK / EXTERNAL_OTHER produce an APPROVAL only. No Signature
 *    row is written, because no electronic signature happened — the binding
 *    contract is executed elsewhere. Recording one would misstate the record.
 *
 * Every path recomputes prices SERVER-SIDE from the published snapshot. The
 * amount a client is held to must never come from the browser.
 */

export type AcceptanceResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

interface BaseInput {
  token: string;
  signerName: string;
  signerEmail: string;
  signerTitle?: string | null;
  selectedTierKey?: string | null;
  selectedAddOnKeys?: string[];
  ip: string | null;
  userAgent: string | null;
}

/**
 * Loads the proposal behind a token and its published snapshot.
 *
 * Returns a discriminated union on `ok` rather than relying on `"error" in x`
 * narrowing, which left the error field as possibly-undefined and would have
 * needed a cast to silence — not something to reach for in code that decides
 * whether a contract was validly accepted.
 */
async function loadForAcceptance(token: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicTokenHash: hashShareToken(token) },
    include: { publishedVersion: true, _count: { select: { signatures: true } } },
  });

  if (!proposal) return { ok: false as const, error: "This link isn't valid." };
  if (proposal.revokedAt) return { ok: false as const, error: "This link has been withdrawn." };
  if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "This proposal has expired." };
  }
  if (!proposal.publishedVersion) {
    return { ok: false as const, error: "This proposal isn't ready yet." };
  }

  return {
    ok: true as const,
    proposal,
    version: proposal.publishedVersion,
  };
}

/**
 * Recomputes the total from the PUBLISHED SNAPSHOT, not from anything the
 * browser sent. The client chooses which tier; it does not get to choose what
 * that tier costs.
 */
type PriceResult =
  | { ok: false; error: string }
  | {
      ok: true;
      tier: { key: string; name: string; priceMinor: number } | null;
      totals: ReturnType<typeof computeTotals>;
      addOnsAmountMinor: number;
    };

function priceFromSnapshot(
  snapshot: unknown,
  selectedTierKey: string | null | undefined,
  selectedAddOnKeys: string[],
): PriceResult {
  const blocks =
    (snapshot as { blocks?: Array<{ type: string; data: unknown; visible?: boolean }> }).blocks ?? [];

  const tiers = blocks
    .filter((b) => b.type === "PRICING_TIERS" && b.visible !== false)
    .flatMap((b) => (b.data as PricingTiersBlock).tiers ?? []);

  const addOns = blocks
    .filter((b) => b.type === "ADD_ONS" && b.visible !== false)
    .flatMap((b) => (b.data as AddOnsBlock).addOns ?? []);

  const tier = selectedTierKey ? (tiers.find((t) => t.key === selectedTierKey) ?? null) : null;

  // A tier key the document does not contain is a tampered submission, not a
  // user error.
  if (selectedTierKey && !tier) {
    return { ok: false, error: "That option isn't part of this proposal." };
  }

  const chosenAddOns = addOns.filter((a) => selectedAddOnKeys.includes(a.key));

  const currency = (snapshot as { currency?: string }).currency ?? "USD";
  const depositPercent = (snapshot as { depositPercent?: number | null }).depositPercent ?? null;

  const totals = computeTotals({
    currency,
    tier,
    addOns: chosenAddOns.map((a) => ({
      key: a.key,
      name: a.name,
      priceMinor: a.priceMinor,
      billingPeriod: a.billingPeriod,
    })),
    depositPercent,
  });

  return {
    ok: true,
    tier,
    totals,
    addOnsAmountMinor: chosenAddOns.reduce((s, a) => s + a.priceMinor, 0),
  };
}

/** Appends to the hash chain inside an existing transaction. */
async function appendEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  proposalId: string,
  type: ProposalEventType,
  meta: Record<string, unknown>,
  ip: string | null,
  userAgent: string | null,
) {
  const previous = await tx.proposalEvent.findFirst({
    where: { proposalId },
    orderBy: { at: "desc" },
    select: { eventHash: true },
  });

  const at = new Date();
  return tx.proposalEvent.create({
    data: {
      proposalId,
      type,
      meta: meta as object,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
      at,
      prevEventHash: previous?.eventHash ?? null,
      eventHash: computeEventHash(previous?.eventHash ?? null, {
        type,
        at: at.toISOString(),
        meta,
      }),
    },
  });
}

/**
 * External-agreement approval. Records that the client approved this scope.
 *
 * Deliberately does NOT write a Signature row, produce a certificate, or use
 * the word "sign" anywhere: the binding contract is executed on Upwork, and
 * claiming otherwise would misrepresent what happened.
 */
export async function approveExternally(input: BaseInput): Promise<AcceptanceResult> {
  const loaded = await loadForAcceptance(input.token);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { proposal, version } = loaded;

  if (proposal.agreementMode === "INLINE_ESIGN") {
    return { ok: false, error: "This proposal is signed in the document." };
  }
  if (proposal.acceptedAt) {
    return { ok: true, status: proposal.status };
  }

  const priced = priceFromSnapshot(
    version.snapshot,
    input.selectedTierKey,
    input.selectedAddOnKeys ?? [],
  );
  if (!priced.ok) return { ok: false, error: priced.error };

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM proposals WHERE id = ${proposal.id} FOR UPDATE`;

    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        selectedTierKey: priced.tier?.key ?? null,
        selectedTierLabel: priced.tier?.name ?? null,
        selectedTierAmountMinor: priced.tier?.priceMinor ?? null,
        addOnsAmountMinor: priced.addOnsAmountMinor,
        totalAmountMinor: priced.totals.totalDueNowMinor,
      },
    });

    await appendEvent(
      tx,
      proposal.id,
      "APPROVED_EXTERNAL",
      {
        versionId: version.id,
        contentHash: version.contentHash,
        approverName: input.signerName,
        approverEmail: input.signerEmail,
        approverTitle: input.signerTitle ?? null,
        selectedTierKey: priced.tier?.key ?? null,
        totalAmountMinor: priced.totals.totalDueNowMinor,
        agreementMode: proposal.agreementMode,
      },
      input.ip,
      input.userAgent,
    );
  });

  return { ok: true, status: "ACCEPTED" };
}

export interface SignInput extends BaseInput {
  method: "TYPED" | "DRAWN";
  /** PNG data URL of the rendered signature. */
  imageDataUrl: string;
  /** Raw stroke points for DRAWN. Stroke dynamics are far more probative than
   *  a flat image if a signature is ever disputed. */
  strokeData?: unknown;
  consentText: string;
  consentVersion: string;
}

/**
 * In-document electronic signature.
 *
 * Writes a Signature bound to the exact published version and its contentHash,
 * so what was agreed to is provable later even if the proposal is edited
 * afterwards (which forks a new version and never mutates this one).
 */
export async function signProposal(input: SignInput): Promise<AcceptanceResult> {
  const loaded = await loadForAcceptance(input.token);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { proposal, version } = loaded;

  if (proposal.agreementMode !== "INLINE_ESIGN") {
    return { ok: false, error: "This proposal is agreed outside the document." };
  }
  if (proposal._count.signatures > 0) {
    return { ok: true, status: proposal.status };
  }

  const priced = priceFromSnapshot(
    version.snapshot,
    input.selectedTierKey,
    input.selectedAddOnKeys ?? [],
  );
  if (!priced.ok) return { ok: false, error: priced.error };

  // Store the rendered signature in a PRIVATE bucket. Never public: it is a
  // reproduction of someone's handwriting.
  let imagePath: string | null = null;
  try {
    const base64 = input.imageDataUrl.replace(/^data:image\/png;base64,/, "");
    const bytes = Buffer.from(base64, "base64");
    // A signature is a few KB. Anything large is wrong, and is not worth
    // storing on the word of an unauthenticated caller.
    if (bytes.length > 0 && bytes.length <= 1_000_000) {
      const path = `${proposal.id}/${version.id}-${Date.now()}.png`;
      const admin = createSupabaseAdminClient();
      const { error } = await admin.storage
        .from("signatures")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (!error) imagePath = path;
      else console.error("Signature image upload failed", error);
    }
  } catch (e) {
    // A storage failure must not lose the signature itself. The audit trail,
    // hashes and consent record are what carry legal weight; the image is
    // corroborating.
    console.error("Signature image handling failed", e);
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM proposals WHERE id = ${proposal.id} FOR UPDATE`;

    await tx.signature.create({
      data: {
        proposalId: proposal.id,
        versionId: version.id,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        signerTitle: input.signerTitle ?? null,
        // No OTP is configured yet, so the address is self-asserted. Recorded
        // honestly as unverified rather than implied to be confirmed.
        emailVerifiedAt: null,
        method: input.method,
        imagePath,
        strokeData: (input.strokeData as object) ?? undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent ?? undefined,
        consentText: input.consentText,
        consentVersion: input.consentVersion,
        contentHash: version.contentHash,
      },
    });

    const needsPayment =
      proposal.paymentEnabled && proposal.paymentTiming !== "NONE";

    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        status: needsPayment ? "AWAITING_PAYMENT" : "ACCEPTED",
        signedAt: new Date(),
        acceptedAt: needsPayment ? null : new Date(),
        selectedTierKey: priced.tier?.key ?? null,
        selectedTierLabel: priced.tier?.name ?? null,
        selectedTierAmountMinor: priced.tier?.priceMinor ?? null,
        addOnsAmountMinor: priced.addOnsAmountMinor,
        totalAmountMinor: priced.totals.totalDueNowMinor,
      },
    });

    await appendEvent(
      tx,
      proposal.id,
      "SIGNED",
      {
        versionId: version.id,
        contentHash: version.contentHash,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
        method: input.method,
        emailVerified: false,
        consentVersion: input.consentVersion,
        selectedTierKey: priced.tier?.key ?? null,
        totalAmountMinor: priced.totals.totalDueNowMinor,
      },
      input.ip,
      input.userAgent,
    );
  });

  return { ok: true, status: "SIGNED" };
}

/** Records that the client picked a tier, before they commit to anything. */
export async function recordTierSelection(
  token: string,
  tierKey: string,
  ip: string | null,
): Promise<void> {
  const proposal = await prisma.proposal.findUnique({
    where: { publicTokenHash: hashShareToken(token) },
    select: { id: true, status: true, acceptedAt: true },
  });
  if (!proposal || proposal.acceptedAt) return;

  await prisma.$transaction(async (tx) => {
    await appendEvent(tx, proposal.id, "TIER_SELECTED", { tierKey }, ip, null);
    if (proposal.status === "SENT" || proposal.status === "VIEWED") {
      await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: "TIER_SELECTED" },
      });
    }
  });
}

export const APP_URL = env.APP_URL;
