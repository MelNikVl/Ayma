import Link from "next/link";
import { cn } from "@/lib/cn";

const options = [
  { key: "popular", label: "Популярные" },
  { key: "new", label: "Новые" },
  { key: "stars", label: "По звёздам" },
] as const;

export function SortTabs({ current, q, tag }: { current: string; q?: string; tag?: string }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-0.5 text-sm">
      {options.map((o) => {
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (tag) p.set("tag", tag);
        if (o.key !== "popular") p.set("sort", o.key);
        const s = p.toString();
        return (
          <Link
            key={o.key}
            href={s ? `/?${s}` : "/"}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              current === o.key ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
