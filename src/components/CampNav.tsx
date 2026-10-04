"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { BriefcaseIcon, PlusIcon, RocketIcon, UsersIcon } from "./icons";

export type Section = "projects" | "teams" | "clients";

/** Раздел сайта по адресу страницы */
export function useSection(): Section {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  if (path.startsWith("/business") || path.startsWith("/jobs")) return "clients";
  if (path.startsWith("/teams") || path.startsWith("/u/") || path.startsWith("/collabs")) return "teams";
  if (path.startsWith("/rating") && params?.get("tab") === "devs") return "teams";
  return "projects";
}

const SECTION_HOME: Record<Section, string> = { projects: "/", teams: "/teams", clients: "/business" };
const SECTION_ICON = { projects: RocketIcon, teams: UsersIcon, clients: BriefcaseIcon } as const;

/** Три основных раздела: Проекты · Команды · Заказчики */
export function SectionTabs({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { d } = useI18n();
  const section = useSection();
  return (
    <nav className={cn("flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-2/60 p-0.5", className)} aria-label="sections">
      {(Object.keys(SECTION_HOME) as Section[]).map((s) => {
        const Icon = SECTION_ICON[s];
        const active = section === s;
        return (
          <Link
            key={s}
            href={SECTION_HOME[s]}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
              compact ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              active ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", active && "text-accent")} />
            {d.sections[s]}
          </Link>
        );
      })}
    </nav>
  );
}

/** Подразделы текущего раздела */
export function SectionSubNav() {
  const { d } = useI18n();
  const section = useSection();
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const tab = params?.get("tab");

  const links: { href: string; label: string; active: boolean; cta?: boolean }[] =
    section === "clients"
      ? [
          { href: "/business", label: d.sub.forBiz, active: path === "/business" },
          { href: "/jobs", label: d.sub.jobs, active: path === "/jobs" || (path.startsWith("/jobs/") && path !== "/jobs/new") },
          { href: "/jobs/new", label: d.sub.postJob, active: path === "/jobs/new", cta: true },
        ]
      : section === "teams"
        ? [
            { href: "/teams", label: d.sub.teams, active: path === "/teams" },
            { href: "/rating?tab=devs", label: d.sub.devs, active: path === "/rating" || path.startsWith("/u/") },
            { href: "/collabs", label: d.sub.collabs, active: path === "/collabs" },
          ]
        : [
            { href: "/", label: d.sub.catalog, active: path === "/" || path.startsWith("/startup/") && path !== "/startup/new" },
            { href: "/rating", label: d.sub.projectRating, active: path === "/rating" && tab !== "devs" },
            { href: "/startup/new", label: d.sub.addProject, active: path === "/startup/new", cta: true },
          ];

  return (
    <div className="border-t border-border/50">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 text-sm no-scrollbar sm:px-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.active ? "page" : undefined}
            className={cn(
              "relative shrink-0 px-2.5 py-2.5 transition-colors",
              l.active ? "font-semibold text-fg" : "text-muted hover:text-fg",
              l.cta && "ml-auto inline-flex items-center gap-1 font-semibold text-accent hover:text-accent",
            )}
          >
            {l.cta && <PlusIcon className="h-3.5 w-3.5" />}
            {l.label}
            {l.active && <span aria-hidden className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-accent" />}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Кнопка «+» в шапке — главное действие раздела */
export function SectionAddButton() {
  const { d } = useI18n();
  const section = useSection();
  const href = section === "clients" ? "/jobs/new" : "/startup/new";
  const label = section === "clients" ? d.sub.postJob : d.sub.addProject;
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
