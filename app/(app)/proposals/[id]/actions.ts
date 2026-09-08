"use server";

import { revalidatePath } from "next/cache";
import { requireOrgScope } from "@/lib/auth";
import { issueShareLink, revokeShareLink } from "@/lib/repositories/proposals";
import { recordEvent } from "@/lib/repositories/events";
import { env } from "@/lib/env";

export type ShareLinkResult =
  | { ok: true; url: string; replaced: boolean }
  | { ok: false; error: string };

/**
 * Mints a share link and hands it back for one-time display.
 *
 * The URL is built from APP_URL rather than the request origin: these links get
 * pasted into Upwork messages and email, where a localhost or preview-deploy
 * origin would be a link the client simply cannot open.
 */
export async function issueShareLinkAction(proposalId: string): Promise<ShareLinkResult> {
  const scope = await requireOrgScope();

  const issued = await issueShareLink(scope, proposalId);
  if (!issued) return { ok: false, error: "Proposal not found." };

  // Recorded because the token itself is never stored: without this event there
  // is no trace of when the link a client used started working.
  await recordEvent({
    proposalId,
    type: "LINK_ISSUED",
    meta: { replaced: issued.replaced },
  }).catch((e) => console.error("Failed to record LINK_ISSUED event", e));

  revalidatePath(`/proposals/${proposalId}`);

  return {
    ok: true,
    url: `${env.APP_URL}/p/${issued.token}`,
    replaced: issued.replaced,
  };
}

export async function revokeShareLinkAction(
  proposalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const scope = await requireOrgScope();

  const revoked = await revokeShareLink(scope, proposalId);
  if (!revoked) return { ok: false, error: "No active link to revoke." };

  await recordEvent({ proposalId, type: "LINK_REVOKED" }).catch((e) =>
    console.error("Failed to record LINK_REVOKED event", e),
  );

  revalidatePath(`/proposals/${proposalId}`);
  return { ok: true };
}
