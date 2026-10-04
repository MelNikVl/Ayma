"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { PlusIcon } from "./icons";

/** «Лагерь» определяется по странице: компании — /business и размещение задачи, остальное — разработчики */
export function useCamp(): "dev" | "biz" {
  const path = usePathname() ?? "/";
  return path.startsWith("/business") || path.startsWith("/jobs/new") ? "biz" : "dev";
}

export function CampSwitch({ className }: { className?: string }) {
  const { d } = useI18n();
  const camp = useCamp();
  return (
    <div className={cn("flex shrink-0 rounded-full border border-border bg-surface-2/60 p-0.5 text-xs font-semibold", className)}>
      {(
        [
          ["dev", "/", d.biz.campDev],
          ["biz", "/business", d.biz.campBiz],
        ] as const
      ).map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          aria-current={camp === key ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            camp === key ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function CampLinks({ mobile = false }: { mobile?: boolean }) {
  const { d } = useI18n();
  const camp = useCamp();
  const path = usePathname() ?? "/";
  const links: [string, string][] =
    camp === "biz"
      ? [
          ["/jobs", d.jobs.nav],
          ["/", d.biz.ctaBrowse],
        ]
      : [
          ["/", d.nav.catalog],
          ["/jobs", d.jobs.nav],
          ["/rating", d.nav.rating],
          ["/collabs", d.nav.collabs],
        ];
  return (
    <>
      {links.map(([href, label]) => {
        const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-md px-2.5 text-muted hover:text-fg",
              mobile ? "py-1" : "py-1.5 hover:bg-surface-2",
              active && "text-fg",
            )}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

/** Кнопка «+»: разработчику — добавить проект, компании — разместить задачу */
export function CampAddButton() {
  const { d } = useI18n();
  const camp = useCamp();
  const href = camp === "biz" ? "/jobs/new" : "/startup/new";
  const label = camp === "biz" ? d.jobs.post : d.nav.add;
  return (
    <>
      <Link href={href} className="btn-secondary hidden xl:inline-flex">
        <PlusIcon className="h-4 w-4" />
        {label}
      </Link>
      <Link href={href} className="btn-secondary px-2.5 xl:hidden" aria-label={label}>
        <PlusIcon className="h-4 w-4" />
      </Link>
    </>
  );
}
