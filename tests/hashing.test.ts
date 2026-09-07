import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  computeContentHash,
  computeEventHash,
  generateShareToken,
  hashShareToken,
  toSignable,
  verifyEventChain,
  type ProposalSnapshot,
} from "@/lib/versioning/snapshot";

/**
 * These tests are load-bearing. An unstable content hash does not fail loudly —
 * it silently invalidates already-signed documents, which is the worst class of
 * bug this product can have.
 */

function baseSnapshot(): ProposalSnapshot {
  return {
    snapshotVersion: 1,
    proposalId: "prop_123",
    title: "AI Intake Automation for Ascend Behavior",
    currency: "USD",
    theme: "DARK",
    validUntil: "2026-10-01T00:00:00.000Z",
    projectStartDate: "2026-09-15T00:00:00.000Z",
    paymentEnabled: true,
    paymentTiming: "DEPOSIT_BEFORE_SIGN",
    depositPercent: 50,
    agreementMode: "INLINE_ESIGN",
    externalAgreementUrl: null,
    externalAgreementNote: null,
    organization: {
      name: "SorvexAI",
      legalName: null,
      email: "swapnil@sorvexai.com",
      website: "https://sorvexai.com",
      logoPath: "/logo.png",
      primaryColor: "#8B5CF6",
      accentColor: "#EC4899",
      tertiaryColor: "#3B82F6",
      addressLines: [],
      taxId: null,
      governingLaw: null,
      signatureBlockName: "Swapnil Garg",
      signatureBlockTitle: "Founder",
    },
    client: {
      company: "Ascend Behavior Partners",
      website: "https://www.ascendbehavior.com",
      logoPath: null,
      contactName: "Jonathan Mueller",
      contactEmail: "jonathan@ascendbehavior.com",
      contactTitle: "Co-founder",
    },
    blocks: [
      {
        id: "b1",
        order: 0,
        visible: true,
        schemaVersion: 1,
        type: "COVER",
        data: {
          title: "AI Intake Automation",
          preparedForLabel: "Prepared for",
          preparedByLabel: "Prepared by",
          showValidity: true,
          showClientLogo: true,
        },
      },
      {
        id: "b2",
        order: 1,
        visible: true,
        schemaVersion: 1,
        type: "PROBLEM_STATEMENT",
        data: {
          eyebrow: "Where you are now",
          title: "The problems you're facing",
          problems: [
            {
              id: "p1",
              heading: "Intake runs on phone tag",
              body: "Every new patient enquiry is handled manually by front desk staff.",
              impact: "~14 hours/week of clinician-adjacent admin",
            },
          ],
        },
      },
    ],
  };
}

/** Rebuilds every object in a tree with its keys in reverse order. */
function deepReverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepReverseKeys);
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).reverse();
    return Object.fromEntries(entries.map(([k, v]) => [k, deepReverseKeys(v)]));
  }
  return value;
}

describe("canonicalJson", () => {
  it("produces identical output regardless of key insertion order", () => {
    const a = { alpha: 1, beta: { x: true, y: [1, 2] }, gamma: "z" };
    const b = { gamma: "z", beta: { y: [1, 2], x: true }, alpha: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("sorts keys, which JSON.stringify does not", () => {
    const value = { zebra: 1, apple: 2 };
    expect(canonicalJson(value)).toBe('{"apple":2,"zebra":1}');
    // Proof the naive approach would have differed:
    expect(JSON.stringify(value)).toBe('{"zebra":1,"apple":2}');
  });

  it("preserves array order, which is semantic", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("rejects values that cannot be represented as plain JSON", () => {
    expect(() => canonicalJson(undefined)).toThrow(/could not be canonicalised/i);
  });
});

describe("computeContentHash", () => {
  it("is stable across repeated calls", () => {
    const snap = baseSnapshot();
    expect(computeContentHash(snap)).toBe(computeContentHash(snap));
  });

  it("is unchanged by a JSONB-style key reordering round trip", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);

    // Postgres JSONB does not preserve object key order. This rebuilds every
    // object in the tree with its keys reversed, which is the exact hazard
    // RFC 8785 canonicalisation exists to neutralise.
    const reordered = deepReverseKeys(snap) as ProposalSnapshot;

    // Sanity-check that the fixture really did get reordered, so this test
    // cannot pass vacuously.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(snap));

    expect(computeContentHash(reordered)).toBe(before);
  });

  it("is unchanged by volatile fields the signer never saw", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const withNoise = {
      ...snap,
      proposalId: "a-completely-different-id",
      organization: { ...snap.organization, logoPath: "/other.png", primaryColor: "#000000" },
    };
    // proposalId, logo and brand colours are excluded from toSignable: they do
    // not change the agreement, only its presentation.
    expect(computeContentHash(withNoise)).toBe(before);
  });

  it("changes when a price the client agreed to changes", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const tampered = structuredClone(snap);
    tampered.depositPercent = 10;
    expect(computeContentHash(tampered)).not.toBe(before);
  });

  it("changes when block copy changes", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const tampered = structuredClone(snap);
    // @ts-expect-error narrowing not needed for this test fixture
    tampered.blocks[1].data.problems[0].heading = "Something else entirely";
    expect(computeContentHash(tampered)).not.toBe(before);
  });

  it("changes when the agreement mode changes", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const tampered = structuredClone(snap);
    tampered.agreementMode = "EXTERNAL_UPWORK";
    expect(computeContentHash(tampered)).not.toBe(before);
  });

  it("ignores hidden blocks, which are not rendered", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const withHidden = structuredClone(snap);
    withHidden.blocks.push({
      id: "b3",
      order: 2,
      visible: false,
      schemaVersion: 1,
      type: "COVER",
      data: {
        title: "Draft I never showed anyone",
        preparedForLabel: "Prepared for",
        preparedByLabel: "Prepared by",
        showValidity: true,
        showClientLogo: true,
      },
    });
    expect(computeContentHash(withHidden)).toBe(before);
  });

  it("orders blocks by `order`, not array position", () => {
    const snap = baseSnapshot();
    const before = computeContentHash(snap);
    const reversed = structuredClone(snap);
    reversed.blocks.reverse();
    expect(computeContentHash(reversed)).toBe(before);
  });

  it("golden file: a fixed snapshot always hashes to the same value", () => {
    // If this fails, canonicalisation or the toSignable projection changed.
    // That is not necessarily wrong, but every previously signed document must
    // be re-verified before this value is updated.
    expect(computeContentHash(baseSnapshot())).toBe(
      "be06eaed64408948557fa40bb881192f8ba0e248e3316009cb5b33f74d972f6e",
    );
  });
});

describe("toSignable", () => {
  it("excludes presentation-only organisation fields", () => {
    const signable = toSignable(baseSnapshot());
    expect(signable.organization).not.toHaveProperty("logoPath");
    expect(signable.organization).not.toHaveProperty("primaryColor");
    expect(signable.organization).toHaveProperty("legalName");
  });
});

describe("share tokens", () => {
  it("generates 128 bits of entropy as base64url", () => {
    const { token } = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(16);
  });

  it("never repeats across a large sample", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(generateShareToken().token);
    expect(seen.size).toBe(5000);
  });

  it("stores only the hash, and the hash is deterministic", () => {
    const { token, tokenHash } = generateShareToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
    expect(hashShareToken(token)).toBe(tokenHash);
  });
});

describe("audit chain", () => {
  function chain(payloads: Array<{ type: string; at: string; meta?: unknown }>) {
    let prev: string | null = null;
    return payloads.map((p) => {
      const eventHash = computeEventHash(prev, p);
      const row = { ...p, prevEventHash: prev, eventHash };
      prev = eventHash;
      return row;
    });
  }

  it("verifies an untampered chain", () => {
    const events = chain([
      { type: "CREATED", at: "2026-09-01T10:00:00.000Z" },
      { type: "PUBLISHED", at: "2026-09-01T11:00:00.000Z" },
      { type: "VIEWED", at: "2026-09-02T09:00:00.000Z", meta: { ip: "1.2.3.4" } },
    ]);
    expect(verifyEventChain(events)).toEqual({ valid: true, brokenAtIndex: null });
  });

  it("detects a mutated event", () => {
    const events = chain([
      { type: "CREATED", at: "2026-09-01T10:00:00.000Z" },
      { type: "SIGNED", at: "2026-09-02T09:00:00.000Z" },
    ]);
    events[1].at = "2026-08-01T09:00:00.000Z"; // backdating a signature
    expect(verifyEventChain(events).valid).toBe(false);
    expect(verifyEventChain(events).brokenAtIndex).toBe(1);
  });

  it("detects a deleted event", () => {
    const events = chain([
      { type: "CREATED", at: "2026-09-01T10:00:00.000Z" },
      { type: "VIEWED", at: "2026-09-02T09:00:00.000Z" },
      { type: "SIGNED", at: "2026-09-03T09:00:00.000Z" },
    ]);
    events.splice(1, 1);
    expect(verifyEventChain(events).valid).toBe(false);
  });
});

/**
 * Edge cases for the in-house RFC 8785 implementation. These matter because the
 * canonicaliser is no longer a third-party package: if it drifts, every
 * signature collected so far silently stops verifying.
 */
describe("canonicalJson — RFC 8785 conformance", () => {
  it("sorts nested object keys, not just top-level ones", () => {
    const a = { outer: { zebra: 1, apple: { yak: 1, ant: 2 } } };
    const b = { outer: { apple: { ant: 2, yak: 1 }, zebra: 1 } };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"outer":{"apple":{"ant":2,"yak":1},"zebra":1}}');
  });

  it("sorts by UTF-16 code unit, so uppercase precedes lowercase", () => {
    expect(canonicalJson({ a: 1, B: 2, A: 3 })).toBe('{"A":3,"B":2,"a":1}');
  });

  it("emits no insignificant whitespace", () => {
    expect(canonicalJson({ a: [1, 2], b: "x" })).toBe('{"a":[1,2],"b":"x"}');
  });

  it("preserves array order inside sorted objects", () => {
    expect(canonicalJson({ z: [3, 1, 2], a: 1 })).toBe('{"a":1,"z":[3,1,2]}');
  });

  it("omits undefined-valued keys, matching JSON.stringify", () => {
    expect(canonicalJson({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it("renders undefined array entries as null, matching JSON.stringify", () => {
    expect(canonicalJson([1, undefined, 3])).toBe("[1,null,3]");
  });

  it("preserves null, which is a value rather than an absence", () => {
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
  });

  it("escapes strings the way JSON does", () => {
    expect(canonicalJson({ s: 'a"b\\c\nd\te' })).toBe('{"s":"a\\"b\\\\c\\nd\\te"}');
  });

  it("handles non-ASCII without mangling it", () => {
    expect(canonicalJson({ s: "Ascend – Behavior · £4,999 → ₹5,00,000" })).toContain("→");
  });

  it("normalises number representation", () => {
    expect(canonicalJson({ n: 1.0 })).toBe('{"n":1}');
    expect(canonicalJson({ n: 1e2 })).toBe('{"n":100}');
    expect(canonicalJson({ n: -0 })).toBe('{"n":0}');
  });

  it("rejects non-finite numbers instead of hashing something meaningless", () => {
    // A NaN reaching a contract hash means a calculation went wrong upstream.
    // Failing loudly beats committing a hash over "null".
    expect(() => canonicalJson({ n: Number.NaN })).toThrow(/non-finite/i);
    expect(() => canonicalJson({ n: Infinity })).toThrow(/non-finite/i);
  });

  it("rejects BigInt rather than coercing it", () => {
    // BigInt(1) rather than the 1n literal: the tsconfig target is ES2017.
    expect(() => canonicalJson({ n: BigInt(1) })).toThrow(/BigInt/i);
  });

  it("honours toJSON, so a stray Date serialises rather than hashing as {}", () => {
    const d = new Date("2026-09-07T00:00:00.000Z");
    expect(canonicalJson({ at: d })).toBe('{"at":"2026-09-07T00:00:00.000Z"}');
  });

  it("survives a full JSON round trip unchanged", () => {
    const snap = baseSnapshot();
    const once = canonicalJson(toSignable(snap));
    const twice = canonicalJson(JSON.parse(once));
    expect(twice).toBe(once);
  });
});
