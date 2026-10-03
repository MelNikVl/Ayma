import Link from "next/link";
import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";
import { QUICK_FILTERS, SORT_KEYS, type QuickFilter, type SortKey } from "@/lib/queries";
import { catalogHref } from "./TagFilter";
import { CoinsIcon, HandshakeIcon, PlugIcon, CheckBadgeIcon } from "./icons";

const ICONS: Record<QuickFilter, typeof PlugIcon> = {
  api: PlugIcon,
  collab: HandshakeIcon,
  funding: CoinsIcon,
  claimed: CheckBadgeIcon,
};

/** Быстрые фильтры + сортировка */
export function CatalogControls({
  sort,
  filters,
  params,
}: {
  sort: SortKey;
  filters: QuickFilter[];
  params: Record<string, string | undefined>;
}) {
  const { d } = getI18n();
  const toggle = (f: QuickFilter) => {
    const next = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f];
    return catalogHref({ ...params, f: next.length ? next.join(",") : undefined, page: undefined });
  };
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => {
          const Icon = ICONS[f];
          const on = filters.includes(f);
          return (
            <Link
              key={f}
              href={toggle(f)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                on ? "border-accent bg-accent/10 text-accent" : "border-border bg-surface text-muted hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              {d.home.quick[f]}
            </Link>
          );
        })}
      </div>
      <div className="-mx-1 flex overflow-x-auto rounded-lg bg-surface-2 p-0.5 text-sm no-scrollbar">
        {SORT_KEYS.map((key) => (
          <Link
            key={key}
            href={catalogHref({ ...params, sort: key === "score" ? undefined : key, page: undefined })}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 font-medium transition-colors",
              sort === key ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            {d.home.sort[key]}
          </Link>
        ))}
      </div>
    </div>
  );
}
