import Link from "next/link";
import { cn } from "@/lib/cn";

interface Props {
  tags: { id: string; name: string; color: string }[];
  active?: string;
  q?: string;
  sort?: string;
}

function hrefFor(tag: string | undefined, q?: string, sort?: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (tag) p.set("tag", tag);
  if (sort) p.set("sort", sort);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export function TagFilter({ tags, active, q, sort }: Props) {
  const activeLc = active?.toLowerCase();
  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6">
      <div className="flex gap-2 pb-1">
        <Link
          href={hrefFor(undefined, q, sort)}
          className={cn(
            "chip",
            !active ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg hover:border-fg/40",
          )}
        >
          Все
        </Link>
        {tags.map((t) => {
          const isActive = activeLc === t.name.toLowerCase();
          return (
            <Link
              key={t.id}
              href={hrefFor(isActive ? undefined : t.name, q, sort)}
              className={cn(
                "chip",
                isActive ? "border-transparent text-white" : "border-border bg-surface text-fg hover:border-fg/40",
              )}
              style={isActive ? { backgroundColor: t.color } : undefined}
              aria-pressed={isActive}
            >
              {t.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
