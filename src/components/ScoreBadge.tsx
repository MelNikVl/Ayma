import { cn } from "@/lib/cn";
import { levelFor } from "@/lib/levels";

/** Цвет по уровню рейтинга (RGB-триплет для CSS) */
export function scoreColor(score: number): string {
  const level = levelFor(score);
  return {
    newbie: "148 163 184",
    builder: "14 165 233",
    pro: "34 197 94",
    expert: "168 85 247",
    legend: "245 158 11",
  }[level];
}

/** Круговой индикатор рейтинга 0–100 */
export function ScoreRing({ score, size = 44, label }: { score: number; size?: number; label?: string }) {
  return (
    <div
      className="score-ring grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, ["--score" as string]: score, ["--ring-color" as string]: scoreColor(score) }}
      title={label}
      aria-label={label ? `${label}: ${score}` : String(score)}
    >
      <div
        className="grid place-items-center rounded-full bg-surface font-bold tabular-nums"
        style={{ width: size - 7, height: size - 7, fontSize: size * 0.32 }}
      >
        {score}
      </div>
    </div>
  );
}

/** Компактная плашка «★ 72» */
export function ScorePill({ score, title, className }: { score: number; title?: string; className?: string }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums", className)}
      style={{ backgroundColor: `rgb(${scoreColor(score)} / 0.14)`, color: `rgb(${scoreColor(score)})` }}
    >
      ★ {score}
    </span>
  );
}
