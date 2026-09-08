import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOrgScope } from "@/lib/auth";
import { getProposal, getProposalEvents } from "@/lib/repositories/proposals";
import { formatMoney } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { RelativeTime } from "@/components/RelativeTime";
import { ShareLinkPanel } from "@/components/ShareLinkPanel";

export const metadata: Metadata = { title: "Proposal" };
export const dynamic = "force-dynamic";

/**
 * Proposal overview.
 *
 * The route the dashboard and the proposals list have always linked to. The
 * plan splits this into /edit, /share and /activity later; until those exist
 * this page carries the parts you cannot work without — the client link, what
 * is published, and the audit trail.
 */
export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = await requireOrgScope();

  const proposal = await getProposal(scope, id);
  if (!proposal) notFound();

  const events = await getProposalEvents(scope, id, 25);

  const value = proposal.totalAmountMinor ?? proposal.selectedTierAmountMinor ?? null;
  const published = proposal.publishedVersion;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Link href="/proposals" className="text-sm text-white/45 hover:text-white/70">
          ← Proposals
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{proposal.title}</h1>
            <p className="mt-1 text-sm text-white/50">
              {proposal.client?.company ?? "No client"}
              {proposal.contact?.name ? ` · ${proposal.contact.name}` : ""}
              {" · updated "}
              <RelativeTime date={proposal.updatedAt} />
            </p>
          </div>
          <StatusBadge status={proposal.status} />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Value" value={value === null ? "—" : formatMoney(value, proposal.currency)} />
        <Fact
          label="Selected package"
          value={proposal.selectedTierLabel ?? proposal.selectedTierKey ?? "None yet"}
        />
        <Fact
          label="Valid until"
          value={
            proposal.validUntil
              ? proposal.validUntil.toISOString().slice(0, 10)
              : "No expiry set"
          }
        />
        <Fact
          label="Agreement"
          value={
            proposal.agreementMode === "INLINE_ESIGN"
              ? "Signed in document"
              : proposal.agreementMode === "EXTERNAL_UPWORK"
                ? "Upwork contract"
                : "External contract"
          }
        />
      </section>

      <ShareLinkPanel
        proposalId={proposal.id}
        hasLink={Boolean(proposal.publicTokenHash)}
        isRevoked={Boolean(proposal.revokedAt)}
        isPublished={Boolean(published)}
      />

      <section className="rounded-xl border border-white/[0.08] p-5">
        <h2 className="text-sm font-medium text-white/70">Published version</h2>
        {published ? (
          <>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row label="Version" value={`v${published.versionNumber}`} />
              <Row label="Blocks" value={String(proposal.blocks.length)} />
              <Row
                label="Published"
                value={
                  proposal.publishedAt ? (
                    <RelativeTime date={proposal.publishedAt} />
                  ) : (
                    "—"
                  )
                }
              />
              <Row label="Content hash" value={published.contentHash.slice(0, 16) + "…"} mono />
            </dl>
            <Link
              href={`/proposals/${proposal.id}/document`}
              className="mt-4 inline-block rounded-lg border border-white/[0.15] px-3 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              View as the client sees it
            </Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            Nothing published yet. The public link serves a frozen version, never the draft
            blocks, so there is nothing for it to serve until a version is published.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white/70">Activity</h2>
        {events.length === 0 ? (
          <p className="text-sm text-white/40">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-white/[0.06] px-4 py-2.5 text-sm"
              >
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white/55">
                  {e.type.replace(/_/g, " ")}
                </span>
                <span className="text-white/35">
                  <RelativeTime date={e.at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] px-4 py-3.5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/40">
        {label}
      </p>
      <p className="mt-1.5 truncate text-[0.9375rem] font-medium">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
      <dt className="text-white/45">{label}</dt>
      <dd className={mono ? "font-mono text-[0.8125rem] text-white/70" : "text-white/80"}>
        {value}
      </dd>
    </div>
  );
}
