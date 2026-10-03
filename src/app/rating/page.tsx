import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weeklyVotes } from "@/lib/queries";
import { levelFor } from "@/lib/levels";
import { STARTUP_SCORE_MAX, USER_SCORE_MAX } from "@/lib/score";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";
import { fill, plural } from "@/i18n/format";
import { StartupLogo } from "@/components/StartupLogo";
import { Avatar } from "@/components/Avatar";
import { ScoreRing, scoreColor } from "@/components/ScoreBadge";
import { ApiBadge, CollabBadge, VerifiedIcon } from "@/components/Badges";
import { profileHref } from "@/components/UserMenu";
import { ArrowUpIcon, TrophyIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.rating.title };
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RatingPage({ searchParams }: { searchParams: { tab?: string; period?: string } }) {
  const { d, locale } = getI18n();
  const tab = searchParams.tab === "devs" ? "devs" : "projects";
  const period = searchParams.period === "week" ? "week" : "all";

  let projects: Array<{
    id: string; slug: string; name: string; shortDesc: string; logoUrl: string | null; score: number; votesCount: number;
    apiStatus: "NONE" | "PLANNED" | "BETA" | "PUBLIC"; openToCollab: boolean; _count: { members: number };
  }> = [];
  let week = new Map<string, number>();
  const select = {
    id: true, slug: true, name: true, shortDesc: true, logoUrl: true, score: true, votesCount: true,
    apiStatus: true, openToCollab: true, _count: { select: { members: true } },
  } as const;

  if (tab === "projects") {
    if (period === "week") {
      week = await weeklyVotes();
      const ids = [...week.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id);
      projects = ids.length ? await prisma.startup.findMany({ where: { id: { in: ids }, status: "APPROVED" }, select }) : [];
      projects.sort((a, b) => (week.get(b.id) ?? 0) - (week.get(a.id) ?? 0) || b.score - a.score);
    } else {
      projects = await prisma.startup.findMany({
        where: { status: "APPROVED" },
        orderBy: [{ score: "desc" }, { votesCount: "desc" }],
        take: 50,
        select,
      });
      week = await weeklyVotes(projects.map((p) => p.id));
    }
  }

  const devs =
    tab === "devs"
      ? await prisma.user.findMany({
          where: { memberships: { some: {} } },
          orderBy: [{ score: "desc" }, { createdAt: "asc" }],
          take: 50,
          select: {
            id: true, username: true, firstName: true, avatarUrl: true, githubLogin: true, score: true, skills: true,
            openToCollab: true, _count: { select: { memberships: true } },
          },
        })
      : [];

  const tabHref = (t: string, p = period) => `/rating?tab=${t}${p === "week" ? "&period=week" : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning/15 text-warning"><TrophyIcon className="h-6 w-6" /></span>
        <h1 className="text-3xl font-extrabold tracking-tight">{d.rating.title}</h1>
      </div>
      <p className="mt-2 max-w-2xl text-muted">{d.rating.text}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-sm">
          {(["projects", "devs"] as const).map((t) => (
            <Link key={t} href={tabHref(t)} className={cn("rounded-md px-4 py-1.5 font-semibold", tab === t ? "bg-surface shadow-card" : "text-muted hover:text-fg")}>
              {t === "projects" ? d.rating.projects : d.rating.developers}
            </Link>
          ))}
        </div>
        {tab === "projects" && (
          <div className="flex rounded-lg bg-surface-2 p-0.5 text-sm">
            {(["all", "week"] as const).map((p) => (
              <Link key={p} href={tabHref("projects", p)} className={cn("rounded-md px-3 py-1.5 font-medium", period === p ? "bg-surface shadow-card" : "text-muted hover:text-fg")}>
                {p === "all" ? d.rating.allTime : d.rating.week}
              </Link>
            ))}
          </div>
        )}
      </div>

      {tab === "projects" ? (
        <ol className="mt-5 space-y-2">
          {projects.length === 0 && <li className="card p-6 text-center text-sm text-muted">{d.home.spotlightEmpty}</li>}
          {projects.map((p, i) => (
            <li key={p.id}>
              <Link href={`/startup/${p.slug}`} className="card flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:gap-4 sm:p-4">
                <span className="w-8 shrink-0 text-center text-lg font-extrabold tabular-nums text-muted">{MEDAL[i] ?? i + 1}</span>
                <StartupLogo name={p.name} logoUrl={p.logoUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-bold">{p.name}</span>
                    {p._count.members > 0 && <VerifiedIcon title={d.card.claimedTeam} />}
                  </div>
                  <p className="truncate text-sm text-muted">{p.shortDesc}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <ApiBadge status={p.apiStatus} label={d.api.status[p.apiStatus]} />
                    {p.openToCollab && <CollabBadge label={d.card.collab} />}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right text-sm sm:block">
                  <div className="inline-flex items-center gap-1 font-semibold tabular-nums">
                    <ArrowUpIcon className="h-4 w-4" /> {p.votesCount}
                  </div>
                  {(week.get(p.id) ?? 0) > 0 && (
                    <div className="text-xs text-warning">{fill(d.rating.votesWeek, { n: week.get(p.id) ?? 0 })}</div>
                  )}
                </div>
                <ScoreRing score={p.score} size={48} label={d.score.title} />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="mt-5 space-y-2">
          {devs.length === 0 && <li className="card p-6 text-center text-sm text-muted">{d.rating.noDevs}</li>}
          {devs.map((u, i) => {
            const level = levelFor(u.score);
            return (
              <li key={u.id}>
                <Link href={profileHref(u)} className="card flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:gap-4 sm:p-4">
                  <span className="w-8 shrink-0 text-center text-lg font-extrabold tabular-nums text-muted">{MEDAL[i] ?? i + 1}</span>
                  <Avatar user={u} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{u.firstName ?? displayName(u)}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      {u.githubLogin && <span>@{u.githubLogin}</span>}
                      <span className="font-semibold" style={{ color: `rgb(${scoreColor(u.score)})` }}>{d.score.levels[level]}</span>
                      <span>· {u._count.memberships} {plural(u._count.memberships, d.common.projects, locale)}</span>
                    </div>
                    {u.skills.length > 0 && <div className="mt-1 truncate text-xs text-muted">{u.skills.slice(0, 6).join(" · ")}</div>}
                  </div>
                  {u.openToCollab && <CollabBadge label={d.card.collab} className="hidden sm:inline-flex" />}
                  <ScoreRing score={u.score} size={48} label={d.score.title} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <section id="how" className="card mt-10 space-y-6 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">{d.score.howTitle}</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">{d.rating.projects}</h3>
            <p className="mt-2 text-sm text-muted">{d.score.howProject}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {(Object.keys(STARTUP_SCORE_MAX) as (keyof typeof STARTUP_SCORE_MAX)[]).map((k) => (
                <li key={k} className="flex gap-3">
                  <span className="w-10 shrink-0 font-bold tabular-nums text-accent">{STARTUP_SCORE_MAX[k]}</span>
                  <span><b>{d.score.parts[k]}</b> — {d.score.hints[k]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">{d.rating.developers}</h3>
            <p className="mt-2 text-sm text-muted">{d.score.howDev}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {(Object.keys(USER_SCORE_MAX) as (keyof typeof USER_SCORE_MAX)[]).map((k) => (
                <li key={k} className="flex gap-3">
                  <span className="w-10 shrink-0 font-bold tabular-nums text-accent">{USER_SCORE_MAX[k]}</span>
                  <span>
                    <b>{k === "profile" ? d.score.parts.profile : k === "support" ? d.score.parts.support : d.score.parts[k]}</b> —{" "}
                    {k === "profile" ? d.score.hints.devProfile : k === "support" ? d.score.hints.devSupport : d.score.hints[k]}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
              {([0, 20, 40, 60, 80] as const).map((min) => (
                <span key={min} className="rounded-md px-2 py-1 font-semibold" style={{ background: `rgb(${scoreColor(min)} / 0.14)`, color: `rgb(${scoreColor(min)})` }}>
                  {d.score.levels[levelFor(min)]} {min}+
                </span>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold">{d.score.improve}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {d.score.improveTips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
