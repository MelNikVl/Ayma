import Link from "next/link";
import { listTeams, type TeamFilter } from "@/lib/teams";
import { displayName } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { fill, formatNumber, plural } from "@/i18n/format";
import { Avatar } from "@/components/Avatar";
import { StartupLogo } from "@/components/StartupLogo";
import { ScorePill } from "@/components/ScoreBadge";
import { DevLinks } from "@/components/DevLinks";
import { Pagination } from "@/components/Pagination";
import { profileHref } from "@/components/UserMenu";
import { CheckBadgeIcon, HandshakeIcon, SearchIcon, UsersIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const { d } = getI18n();
  return { title: d.teams.title, description: d.teams.text };
}

type SP = { q?: string; f?: string; page?: string };
const FILTERS: TeamFilter[] = ["ayma", "collab"];

function href(p: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/teams?${s}` : "/teams";
}

/** Цвет «аватара» автора коммитов по имени — без запросов к GitHub */
function hue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

export default async function TeamsPage({ searchParams }: { searchParams: SP }) {
  const { d, locale } = getI18n();
  const q = searchParams.q?.trim().slice(0, 80) || undefined;
  const filters = (searchParams.f?.split(",") ?? []).filter((f): f is TeamFilter => FILTERS.includes(f as TeamFilter));
  const page = Number(searchParams.page) || 1;
  const res = await listTeams({ q, filters, page });
  const f = filters.length ? filters.join(",") : undefined;

  const toggle = (x: TeamFilter) => {
    const next = filters.includes(x) ? filters.filter((y) => y !== x) : [...filters, x];
    return href({ q, f: next.length ? next.join(",") : undefined });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{d.teams.title}</h1>
          <p className="mt-2 max-w-2xl text-muted">{d.teams.text}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <UsersIcon className="h-4 w-4" /> {fill(d.teams.onAyma, { n: formatNumber(res.onAyma, locale) })}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/teams" className="relative flex-1">
          {f && <input type="hidden" name="f" value={f} />}
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder={d.teams.searchPh} className="input rounded-full pl-10" aria-label={d.teams.search} />
        </form>
        <div className="flex gap-2">
          {FILTERS.map((x) => {
            const on = filters.includes(x);
            const Icon = x === "ayma" ? CheckBadgeIcon : HandshakeIcon;
            return (
              <Link
                key={x}
                href={toggle(x)}
                aria-pressed={on}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
                  on ? "border-fg bg-fg text-bg" : "border-border bg-surface text-muted hover:text-fg",
                )}
              >
                <Icon className="h-4 w-4" /> {x === "ayma" ? d.teams.filterAyma : d.teams.filterCollab}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mb-4 mt-5 text-sm text-muted">
        {fill(d.teams.count, { n: formatNumber(res.total, locale), teams: plural(res.total, d.teams.teamsForms, locale) })}
      </p>

      {res.items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <div className="text-4xl">👥</div>
          <h2 className="mt-3 text-lg font-semibold">{d.teams.empty}</h2>
          <p className="mt-1 text-sm text-muted">{d.teams.emptyText}</p>
          <Link href="/teams" className="btn-secondary mt-5">{d.home.reset}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {res.items.map((t) => {
            const claimed = t.members.length > 0;
            return (
              <article key={t.id} className="card flex flex-col p-5 transition-shadow hover:shadow-card-hover">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-lg font-bold">{t.team}</h2>
                      {claimed && <CheckBadgeIcon className="h-4 w-4 shrink-0 text-accent" aria-label={d.teams.members} />}
                    </div>
                    <Link href={`/startup/${t.slug}`} className="mt-1 flex items-center gap-2 text-sm text-muted hover:text-accent">
                      <StartupLogo name={t.project} logoUrl={t.logoUrl} size={20} />
                      <span className="truncate">{t.project}</span>
                    </Link>
                  </div>
                  <ScorePill score={t.score} title={d.card.score} />
                </div>

                {claimed ? (
                  <ul className="mt-4 space-y-1.5">
                    {t.members.map((m) => (
                      <li key={m.user.id} className="flex items-center gap-2">
                        <Link href={profileHref(m.user)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-sm hover:bg-surface-2">
                          <Avatar user={m.user} size={28} />
                          <span className="truncate font-medium">{m.user.firstName ?? displayName(m.user)}</span>
                          {m.user.githubLogin && <span className="truncate text-xs text-muted">@{m.user.githubLogin}</span>}
                        </Link>
                        <DevLinks linkedinUrl={m.user.linkedinUrl} resumeUrl={m.user.resumeUrl} />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {t.authors.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{d.teams.contributors}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.authors.slice(0, 5).map((a) => (
                        <span key={a.name} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pl-0.5 pr-2 text-xs" title={fill(d.teams.commits, { n: a.commits })}>
                          <span
                            aria-hidden
                            className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: `hsl(${hue(a.name)} 60% 50%)` }}
                          >
                            {a.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="max-w-[9rem] truncate">{a.name}</span>
                        </span>
                      ))}
                      {t.authors.length > 5 && (
                        <span className="rounded-full px-2 py-0.5 text-xs text-muted">{fill(d.teams.more, { n: t.authors.length - 5 })}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
                  {t.openToCollab ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-violet-500">
                      <HandshakeIcon className="h-3.5 w-3.5" /> {d.teams.filterCollab}
                    </span>
                  ) : claimed ? (
                    <span className="inline-flex items-center gap-1 text-accent">
                      <CheckBadgeIcon className="h-3.5 w-3.5" /> {d.teams.members}
                    </span>
                  ) : (
                    <span className="text-muted">{d.teams.notClaimed}</span>
                  )}
                  {!claimed && (
                    <Link href={`/startup/${t.slug}#team`} className="shrink-0 font-semibold text-accent hover:underline">
                      {d.teams.claim}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination page={res.page} pages={res.pages} params={{ q, f }} basePath="/teams" />
    </div>
  );
}
