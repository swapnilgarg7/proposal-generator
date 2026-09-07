const TONES: Record<string, string> = {
  DRAFT: "border-white/15 text-white/50",
  SENT: "border-blue-400/40 text-blue-300",
  VIEWED: "border-violet-400/40 text-violet-300",
  TIER_SELECTED: "border-violet-400/50 text-violet-200",
  SIGNED: "border-emerald-400/40 text-emerald-300",
  AWAITING_PAYMENT: "border-amber-400/40 text-amber-300",
  ACCEPTED: "border-emerald-400/60 text-emerald-200",
  DECLINED: "border-red-400/40 text-red-300",
  EXPIRED: "border-white/12 text-white/35",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] ${
        TONES[status] ?? TONES.DRAFT
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
