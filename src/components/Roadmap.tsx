import { cn } from "@/lib/cn";
import type { RoadmapItem } from "@/lib/validation";
import { getI18n } from "@/i18n/server";

export function parseRoadmap(value: unknown): RoadmapItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is RoadmapItem => Boolean(r && typeof r === "object" && "title" in r))
    .map((r) => ({
      title: String(r.title),
      period: r.period ? String(r.period) : null,
      status: r.status === "done" || r.status === "doing" ? r.status : "planned",
    }));
}

/** Вертикальная дорожная карта */
export function Roadmap({ items }: { items: RoadmapItem[] }) {
  const { d } = getI18n();
  return (
    <ol className="relative space-y-5 border-l-2 border-border pl-6">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[33px] top-0.5 grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] font-bold",
              item.status === "done" && "border-success bg-success text-white",
              item.status === "doing" && "border-accent bg-surface text-accent",
              item.status === "planned" && "border-border bg-surface text-muted",
            )}
          >
            {item.status === "done" ? "✓" : item.status === "doing" ? "•" : ""}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className={cn("font-semibold", item.status === "planned" && "text-muted")}>{item.title}</span>
            {item.period && <span className="text-xs text-muted">{item.period}</span>}
          </div>
          <span
            className={cn(
              "mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold",
              item.status === "done" && "bg-success/15 text-success",
              item.status === "doing" && "bg-accent/10 text-accent",
              item.status === "planned" && "bg-surface-2 text-muted",
            )}
          >
            {d.startup.roadmapStatus[item.status]}
          </span>
        </li>
      ))}
    </ol>
  );
}
