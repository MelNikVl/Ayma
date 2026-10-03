import { getI18n } from "@/i18n/server";
import { fill, formatPrice } from "@/i18n/format";

export function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const { d, locale } = getI18n();
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold tabular-nums">{formatPrice(raised, locale)}</span>
        <span className="text-xs text-muted">{fill(d.startup.raisedOf, { goal: formatPrice(goal, locale) })}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted">{fill(d.startup.goal, { pct })}</div>
    </div>
  );
}
