import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { proposalBlockSchema } from "@/lib/blocks/schemas";

/**
 * Document snapshots, canonicalisation and hashing.
 *
 * This module is load-bearing for the legal defensibility of every signature,
 * so it is deliberately small, pure, and covered by golden-file tests.
 */

// ─────────────────────────────────────────────────────────────────
// Snapshot shape
// ─────────────────────────────────────────────────────────────────

export const snapshotOrganizationSchema = z.object({
  name: z.string(),
  legalName: z.string().nullable(),
  email: z.string(),
  website: z.string().nullable(),
  logoPath: z.string().nullable(),
  primaryColor: z.string(),
  accentColor: z.string(),
  tertiaryColor: z.string(),
  addressLines: z.array(z.string()),
  taxId: z.string().nullable(),
  governingLaw: z.string().nullable(),
  signatureBlockName: z.string().nullable(),
  signatureBlockTitle: z.string().nullable(),
});

export const snapshotClientSchema = z.object({
  company: z.string(),
  website: z.string().nullable(),
  logoPath: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactTitle: z.string().nullable(),
});

export const proposalSnapshotSchema = z.object({
  /** Bumped when the snapshot envelope itself changes shape. */
  snapshotVersion: z.literal(1),

  proposalId: z.string(),
  title: z.string(),
  currency: z.string(),
  theme: z.enum(["DARK", "LIGHT"]),

  validUntil: z.string().nullable(),
  projectStartDate: z.string().nullable(),

  paymentEnabled: z.boolean(),
  paymentTiming: z.enum([
    "NONE",
    "DEPOSIT_BEFORE_SIGN",
    "DEPOSIT_AFTER_SIGN",
    "FULL_AFTER_SIGN",
  ]),
  depositPercent: z.number().int().min(0).max(100).nullable(),

  /** Where the binding contract is executed. Part of what the client agreed
   *  to, so it is inside the hash, not merely a rendering hint. */
  agreementMode: z.enum(["INLINE_ESIGN", "EXTERNAL_UPWORK", "EXTERNAL_OTHER"]),
  externalAgreementUrl: z.string().nullable(),
  externalAgreementNote: z.string().nullable(),

  organization: snapshotOrganizationSchema,
  client: snapshotClientSchema,

  blocks: z.array(proposalBlockSchema),
});

export type ProposalSnapshot = z.infer<typeof proposalSnapshotSchema>;

// ─────────────────────────────────────────────────────────────────
// Canonicalisation
// ─────────────────────────────────────────────────────────────────

/**
 * RFC 8785 JSON Canonicalization Scheme.
 *
 * JSON.stringify is NOT usable here. Its key order follows object insertion
 * order, and a JSONB round-trip through Postgres reorders keys freely. Hashing
 * stringify output would therefore produce a different hash for a document
 * whose content never changed, and signed proposals would fail their own
 * verification for no reason a human could see.
 *
 * RFC 8785 fixes this: keys sorted by UTF-16 code unit, no insignificant
 * whitespace, and a single normalised number representation.
 *
 * Implemented here rather than taken from a package. It is forty lines, it is
 * the single most load-bearing function in the product, and an unannounced
 * upstream change to it would silently invalidate every signature already
 * collected. The golden-file test in tests/hashing.test.ts pins the output.
 *
 * Two details that carry the spec:
 *  - `Object.keys().sort()` uses JavaScript's default string comparison, which
 *    is ordinal over UTF-16 code units — exactly what RFC 8785 mandates.
 *  - Number and string serialisation delegate to JSON.stringify, whose output
 *    is ECMAScript Number::toString and minimal JSON escaping, also what the
 *    spec requires.
 */
function canonicalizeValue(value: unknown): string | undefined {
  if (value === null) return "null";

  const t = typeof value;

  if (t === "boolean") return value ? "true" : "false";

  if (t === "number") {
    const n = value as number;
    if (!Number.isFinite(n)) {
      throw new Error(
        `Cannot canonicalise the non-finite number ${String(n)}. NaN and Infinity ` +
          `have no JSON representation, so hashing them is not well defined.`,
      );
    }
    return JSON.stringify(n);
  }

  if (t === "string") return JSON.stringify(value);

  if (t === "bigint") {
    throw new Error("Cannot canonicalise a BigInt: it has no JSON representation.");
  }

  if (Array.isArray(value)) {
    // Array order is semantic and is preserved. Holes and undefined entries
    // become null, matching JSON.stringify.
    const items = value.map((v) => canonicalizeValue(v) ?? "null");
    return `[${items.join(",")}]`;
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;

    // Honour toJSON (Date, and anything else that opts in) before inspecting
    // own keys, exactly as JSON.stringify does.
    const toJSON = (obj as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === "function") {
      return canonicalizeValue((toJSON as () => unknown).call(obj));
    }

    const parts: string[] = [];
    for (const key of Object.keys(obj).sort()) {
      const serialised = canonicalizeValue(obj[key]);
      // Undefined-valued keys are omitted, matching JSON.stringify.
      if (serialised === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${serialised}`);
    }
    return `{${parts.join(",")}}`;
  }

  // undefined, function, symbol
  return undefined;
}

export function canonicalJson(value: unknown): string {
  const out = canonicalizeValue(value);
  if (out === undefined) {
    throw new Error(
      "Value could not be canonicalised. Snapshots must be plain JSON — no " +
        "undefined, functions, symbols, BigInt, Date objects or class instances.",
    );
  }
  return out;
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

// ─────────────────────────────────────────────────────────────────
// The signable projection
// ─────────────────────────────────────────────────────────────────

/**
 * An EXPLICIT projection of what the signer actually saw.
 *
 * Never hash a raw database row. Rows carry volatile fields (updatedAt, view
 * counters, internal notes) that would change the hash without changing the
 * document, and may carry fields the signer was never shown — which would make
 * the hash misrepresent what was agreed.
 *
 * Hidden blocks are excluded because they are not rendered, and blocks are
 * sorted by `order` so a reorder that does not change presentation does not
 * change the hash.
 */
export function toSignable(snapshot: ProposalSnapshot) {
  return {
    snapshotVersion: snapshot.snapshotVersion,
    title: snapshot.title,
    currency: snapshot.currency,
    theme: snapshot.theme,
    validUntil: snapshot.validUntil,
    projectStartDate: snapshot.projectStartDate,
    paymentEnabled: snapshot.paymentEnabled,
    paymentTiming: snapshot.paymentTiming,
    depositPercent: snapshot.depositPercent,
    agreementMode: snapshot.agreementMode,
    externalAgreementUrl: snapshot.externalAgreementUrl,
    externalAgreementNote: snapshot.externalAgreementNote,
    organization: {
      name: snapshot.organization.name,
      legalName: snapshot.organization.legalName,
      email: snapshot.organization.email,
      addressLines: snapshot.organization.addressLines,
      taxId: snapshot.organization.taxId,
      governingLaw: snapshot.organization.governingLaw,
    },
    client: {
      company: snapshot.client.company,
      contactName: snapshot.client.contactName,
      contactEmail: snapshot.client.contactEmail,
      contactTitle: snapshot.client.contactTitle,
    },
    blocks: snapshot.blocks
      .filter((b) => b.visible)
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((b) => ({ type: b.type, schemaVersion: b.schemaVersion, data: b.data })),
  };
}

/** SHA-256 over the RFC 8785 canonical form of the signable projection. */
export function computeContentHash(snapshot: ProposalSnapshot): string {
  return sha256Hex(canonicalJson(toSignable(snapshot)));
}

/** Hash of the exact PDF bytes shown to the signer. This is the artifact a
 *  human can actually look at in a dispute, so it is stored alongside. */
export function computeDocumentHash(pdfBytes: Buffer): string {
  return sha256Hex(pdfBytes);
}

// ─────────────────────────────────────────────────────────────────
// Share tokens
// ─────────────────────────────────────────────────────────────────

/**
 * 128 bits of entropy, base64url. Only the SHA-256 hash is persisted, so a
 * database read cannot hand an attacker every live proposal link. Lookup is by
 * hash, which is also why no salt is used: we must be able to find the row.
 */
export function generateShareToken(): { token: string; tokenHash: string } {
  const token = randomBytes(16).toString("base64url");
  return { token, tokenHash: hashShareToken(token) };
}

export function hashShareToken(token: string): string {
  return sha256Hex(token);
}

/** Constant-time comparison, for passcodes and OTP codes. */
export function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

// ─────────────────────────────────────────────────────────────────
// Audit chain
// ─────────────────────────────────────────────────────────────────

/**
 * Hash-chains the audit trail so it is tamper-evident rather than merely "a
 * table we control". Altering or deleting any event breaks every subsequent
 * link, which is cheap to compute and easy to demonstrate.
 */
export function computeEventHash(
  prevEventHash: string | null,
  payload: { type: string; at: string; meta?: unknown },
): string {
  return sha256Hex((prevEventHash ?? "GENESIS") + canonicalJson(payload));
}

export function verifyEventChain(
  events: Array<{ type: string; at: string; meta?: unknown; prevEventHash: string | null; eventHash: string }>,
): { valid: boolean; brokenAtIndex: number | null } {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prevEventHash !== prev) return { valid: false, brokenAtIndex: i };
    const expected = computeEventHash(prev, { type: e.type, at: e.at, meta: e.meta });
    if (expected !== e.eventHash) return { valid: false, brokenAtIndex: i };
    prev = e.eventHash;
  }
  return { valid: true, brokenAtIndex: null };
}
