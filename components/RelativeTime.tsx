const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * Rendered on the server with an absolute value in the tooltip.
 *
 * "2 hours ago" is friendlier to scan, but anything touching a contract needs
 * the exact timestamp available — so the title attribute always carries it.
 */
export function RelativeTime({ date }: { date: Date | string }) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;

  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);

  let label = "just now";
  if (abs >= 60 * 1000) {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, ms] of UNITS) {
      if (abs >= ms) {
        label = rtf.format(Math.round(diff / ms), unit);
        break;
      }
    }
  }

  return (
    <time dateTime={d.toISOString()} title={d.toUTCString()}>
      {label}
    </time>
  );
}
