import { getI18n } from "@/i18n/server";
import { scoreColor, ScoreRing } from "./ScoreBadge";

type Part = { key: string; label: string; hint: string; value: number; max: number };

/** Рейтинг с разбивкой по составляющим */
export function ScoreBreakdown({
  score,
  parts,
  levelLabel,
}: {
  score: number;
  parts: Part[];
  levelLabel?: string;
}) {
  const { d } = getI18n();
  return (
    <div>
      <div className="flex items-center gap-4">
        <ScoreRing score={score} size={64} label={d.score.title} />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{d.score.title}</div>
          <div className="text-2xl font-extrabold tabular-nums">
            {score} <span className="text-sm font-medium text-muted">{d.score.outOf}</span>
          </div>
          {levelLabel && (
            <div className="text-xs font-semibold" style={{ color: `rgb(${scoreColor(score)})` }}>
              {levelLabel}
            </div>
          )}
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {parts.map((p) => (
          <li key={p.key} title={p.hint}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{p.label}</span>
              <span className="tabular-nums text-muted">
                {p.value} / {p.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((p.value / p.max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
