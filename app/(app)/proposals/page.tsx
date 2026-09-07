import Link from "next/link";
import type { Metadata } from "next";
import { requireOrgScope } from "@/lib/auth";
import { listProposals } from "@/lib/repositories/proposals";
import { formatMoney } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { RelativeTime } from "@/components/RelativeTime";

export const metadata: Metadata = { title: "Proposals" };
export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const scope = await requireOrgScope();
  const proposals = await listProposals(scope);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Proposals</h1>
          <p className="mt-1 text-sm text-white/50">
            {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
          </p>
        </div>
      </header>

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.12] px-6 py-16 text-center">
          <p className="font-medium text-white/70">Nothing here yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08]">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link
                href={`/proposals/${p.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {p.client?.company ?? "No client"}
                    {p.contact?.name ? ` · ${p.contact.name}` : ""}
                    {" · updated "}
                    <RelativeTime date={p.updatedAt} />
                  </p>
                </div>
                {p.totalAmountMinor || p.selectedTierAmountMinor ? (
                  <span className="money hidden shrink-0 text-sm text-white/60 sm:block">
                    {formatMoney(p.totalAmountMinor ?? p.selectedTierAmountMinor ?? 0, p.currency)}
                  </span>
                ) : null}
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
