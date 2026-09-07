import Link from "next/link";
import type { Metadata } from "next";
import { requireOrgScope, requireUser } from "@/lib/auth";
import { getDashboardStats, getRecentActivity, listProposals } from "@/lib/repositories/proposals";
import { formatMoney } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { RelativeTime } from "@/components/RelativeTime";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = await requireOrgScope();

  const [stats, proposals, activity] = await Promise.all([
    getDashboardStats(scope),
    listProposals(scope, { limit: 8 }),
    getRecentActivity(scope, 10),
  ]);

  const money = (n: number) => formatMoney(n, stats.currency);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {greeting()}, {user.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {stats.awaitingResponse > 0
            ? `${stats.awaitingResponse} proposal${stats.awaitingResponse === 1 ? "" : "s"} out with clients right now.`
            : "Nothing out with clients at the moment."}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In play" value={money(stats.pipelineValueMinor)} hint={`${stats.awaitingResponse} awaiting response`} />
        <Stat label="Signed" value={money(stats.signedValueMinor)} hint={`${stats.signed} closed`} accent />
        <Stat
          label="View to sign"
          value={stats.viewToSignRate === null ? "—" : `${Math.round(stats.viewToSignRate * 100)}%`}
          hint={stats.viewToSignRate === null ? "No proposals sent yet" : "Of proposals sent"}
        />
        <Stat label="Drafts" value={String(stats.drafts)} hint={`${stats.total} total`} />
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-white/70">Recent proposals</h2>
          <Link href="/proposals" className="text-sm text-accent-violet hover:underline">
            View all
          </Link>
        </div>

        {proposals.length === 0 ? (
          <EmptyState />
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
                      {" · "}
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
      </section>

      {activity.length > 0 ? (
        <section>
          <h2 className="mb-4 text-sm font-medium text-white/70">Activity</h2>
          <ul className="space-y-2.5">
            {activity.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-28 shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white/35">
                  {e.type.replace(/_/g, " ")}
                </span>
                <span className="min-w-0 flex-1 truncate text-white/60">
                  {e.proposal.client?.company ?? e.proposal.title}
                </span>
                <span className="shrink-0 text-white/30">
                  <RelativeTime date={e.at} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p
        className={`money mt-2 text-2xl font-semibold tracking-[-0.02em] ${
          accent ? "text-gradient-brand" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[0.8125rem] text-white/35">{hint}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] px-6 py-14 text-center">
      <p className="font-medium text-white/70">No proposals yet</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/40">
        Run <code className="font-mono text-white/60">npm run db:seed</code> for a worked example, or
        create one from scratch.
      </p>
    </div>
  );
}
