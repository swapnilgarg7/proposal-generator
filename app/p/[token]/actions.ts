"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  approveExternally,
  recordTierSelection,
  signProposal,
  type AcceptanceResult,
} from "@/lib/repositories/acceptance";

/**
 * Public, unauthenticated server actions.
 *
 * The share token IS the credential, so every action re-resolves the proposal
 * from the token server-side. Nothing the browser sends about identity, pricing
 * or state is trusted — the client picks a tier key, and the server decides what
 * that key costs.
 */

async function requestContext() {
  const h = await headers();
  return {
    // Vercel puts the real client IP first in x-forwarded-for.
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  };
}

const tokenSchema = z.string().min(10).max(128);

const identitySchema = z.object({
  token: tokenSchema,
  signerName: z.string().trim().min(2, "Enter your full name.").max(120),
  signerEmail: z.string().trim().email("Enter a valid email address.").max(200),
  signerTitle: z.string().trim().max(120).optional().or(z.literal("")),
  selectedTierKey: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/)
    .nullable()
    .optional(),
  selectedAddOnKeys: z
    .array(z.string().trim().regex(/^[a-z0-9-]{1,40}$/))
    .max(20)
    .default([]),
});

const signSchema = identitySchema.extend({
  method: z.enum(["TYPED", "DRAWN"]),
  imageDataUrl: z
    .string()
    .startsWith("data:image/png;base64,")
    // ~1.3MB of base64 is roughly 1MB of PNG. A signature is a few KB; anything
    // larger is not a signature.
    .max(1_400_000),
  strokeData: z.unknown().optional(),
  consentText: z.string().trim().min(1).max(2000),
  consentVersion: z.string().trim().min(1).max(20),
  consented: z.literal(true, {
    message: "You need to tick the box to continue.",
  }),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

export async function approveExternalAction(
  raw: z.input<typeof identitySchema> & { consented: boolean },
): Promise<AcceptanceResult> {
  const parsed = identitySchema
    .extend({ consented: z.literal(true, { message: "You need to tick the box to continue." }) })
    .safeParse(raw);

  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const ctx = await requestContext();
  const result = await approveExternally({
    token: parsed.data.token,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerTitle: parsed.data.signerTitle || null,
    selectedTierKey: parsed.data.selectedTierKey ?? null,
    selectedAddOnKeys: parsed.data.selectedAddOnKeys,
    ...ctx,
  });

  if (result.ok) revalidatePath(`/p/${parsed.data.token}`);
  return result;
}

export async function signProposalAction(
  raw: z.input<typeof signSchema>,
): Promise<AcceptanceResult> {
  const parsed = signSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const ctx = await requestContext();
  const result = await signProposal({
    token: parsed.data.token,
    signerName: parsed.data.signerName,
    signerEmail: parsed.data.signerEmail,
    signerTitle: parsed.data.signerTitle || null,
    selectedTierKey: parsed.data.selectedTierKey ?? null,
    selectedAddOnKeys: parsed.data.selectedAddOnKeys,
    method: parsed.data.method,
    imageDataUrl: parsed.data.imageDataUrl,
    strokeData: parsed.data.strokeData,
    consentText: parsed.data.consentText,
    consentVersion: parsed.data.consentVersion,
    ...ctx,
  });

  if (result.ok) revalidatePath(`/p/${parsed.data.token}`);
  return result;
}

export async function recordTierSelectionAction(token: string, tierKey: string): Promise<void> {
  const parsedToken = tokenSchema.safeParse(token);
  const parsedTier = z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .safeParse(tierKey);
  if (!parsedToken.success || !parsedTier.success) return;

  const ctx = await requestContext();
  // Analytics must never break the page for a client trying to read a proposal.
  try {
    await recordTierSelection(parsedToken.data, parsedTier.data, ctx.ip);
  } catch (e) {
    console.error("Failed to record tier selection", e);
  }
}
