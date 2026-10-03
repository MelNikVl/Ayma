import Link from "next/link";
import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";
import { tTag } from "@/i18n/dictionaries";

export function catalogHref(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

interface Props {
  tags: { id: string; name: string; color: string }[];
  active?: string;
  params: Record<string, string | undefined>;
}

export function TagFilter({ tags, active, params }: Props) {
  const { d } = getI18n();
  const activeLc = active?.toLowerCase();
  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6">
      <div className="flex gap-2 pb-1">
        <Link
          href={catalogHref({ ...params, tag: undefined })}
          className={cn("chip", !active ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg hover:border-fg/40")}
        >
          {d.common.all}
        </Link>
        {tags.map((t) => {
          const isActive = activeLc === t.name.toLowerCase();
          return (
            <Link
              key={t.id}
              href={catalogHref({ ...params, tag: isActive ? undefined : t.name })}
              className={cn(
                "chip",
                isActive ? "border-transparent text-white" : "border-border bg-surface text-fg hover:border-fg/40",
              )}
              style={isActive ? { backgroundColor: t.color } : undefined}
              aria-pressed={isActive}
            >
              {tTag(d, t.name)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
