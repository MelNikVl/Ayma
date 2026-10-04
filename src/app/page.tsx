import Link from "next/link";
import {
  catalogStats,
  listCatalogTags,
  listStartups,
  QUICK_FILTERS,
  SORT_KEYS,
  spotlight,
  homeSidebar,
  userVotes,
  type QuickFilter,
  type SortKey,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { fill, formatNumber, formatPrice, plural } from "@/i18n/format";
import { StartupCard } from "@/components/StartupCard";
import { StartupRow } from "@/components/StartupRow";
import { TagFilter } from "@/components/TagFilter";
import { CatalogControls } from "@/components/CatalogControls";
import { Pagination } from "@/components/Pagination";
import { StartupLogo } from "@/components/StartupLogo";
import { ScoreRing } from "@/components/ScoreBadge";
import { VoteButton } from "@/components/VoteButton";
import { GithubIcon, HandshakeIcon, SearchIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { catalogHref } from "@/components/TagFilter";
import { formatRelative } from "@/i18n/format";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; tag?: string; sort?: string; page?: string; f?: string; view?: string };

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() ? s.trim().slice(0, 100) : undefined;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { d, locale } = getI18n();
  const q = one(searchParams.q);
  const tag = one(searchParams.tag);
  const sortRaw = one(searchParams.sort) as SortKey | undefined;
  const sort: SortKey = sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : "score";
  const filters = (one(searchParams.f)?.split(",") ?? []).filter((f): f is QuickFilter =>
    QUICK_FILTERS.includes(f as QuickFilter),
  );
  const page = Number(one(searchParams.page)) || 1;
  const isFiltered = Boolean(q || tag || filters.length || page > 1);
  const view = one(searchParams.view) === "grid" ? "grid" : "list";

  const user = await getCurrentUser();
  const [tags, result, stats, spot, side] = await Promise.all([
    listCatalogTags(),
    listStartups({ q, tag, sort, page, filters }),
    catalogStats(),
    isFiltered ? Promise.resolve(null) : spotlight(),
    homeSidebar(),
  ]);
  const voted = await userVotes(user?.id, [...result.items.map((i) => i.id), ...(spot ? [spot.item.id] : [])]);
  const params = {
    q,
    tag,
    sort: sort === "score" ? undefined : sort,
    f: filters.length ? filters.join(",") : undefined,
    view: view === "grid" ? "grid" : undefined,
  };
  const ranked = !q && !tag && !filters.length && (sort === "score" || sort === "week" || sort === "votes");

  return (
    <div>
      {!isFiltered && (
        <section className="hero-mesh border-b border-border/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14">
            <div className="flex flex-col justify-center">
              <h1 className="max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{d.home.heroTitle}</h1>
              <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{d.home.heroText}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/dashboard" className="btn-primary px-5 py-3">
                  <SearchIcon className="h-4 w-4" /> {d.home.heroCtaFind}
                </Link>
                <Link href="/startup/new" className="btn-secondary px-5 py-3">{d.home.heroCtaAdd}</Link>
              </div>
              <dl className="mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  [stats.projects, d.home.statProjects],
                  [stats.developers, d.home.statDevelopers],
                  [stats.api, d.home.statApi],
                  [stats.collab, d.home.statCollab],
                ].map(([value, label]) => (
                  <div key={String(label)}>
                    <dt className="text-2xl font-extrabold tabular-nums">{formatNumber(Number(value), locale)}</dt>
                    <dd className="text-xs text-muted">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {spot && (
              <Link
                href={`/startup/${spot.item.slug}`}
                className="card group relative flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className="h-28 bg-cover bg-center"
                  style={{
                    backgroundImage: spot.item.coverUrl
                      ? `url(${spot.item.coverUrl})`
                      : `linear-gradient(135deg, ${spot.item.pageAccent ?? "#0066FF"}, #7C3AED)`,
                  }}
                />
                <div className="-mt-8 flex items-end justify-between gap-3 px-5">
                  <StartupLogo name={spot.item.name} logoUrl={spot.item.logoUrl} size={64} className="ring-4 ring-surface" />
                  <ScoreRing score={spot.item.score} size={48} label={d.score.title} />
                </div>
                <div className="p-5 pt-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
                    <TrophyIcon className="h-3.5 w-3.5" /> {d.home.spotlight}
                  </div>
                  <h2 className="mt-2 text-xl font-bold group-hover:text-accent">{spot.item.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{spot.item.shortDesc}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold tabular-nums">
                      {spot.item.preOrderEnabled ? `${d.card.preorderFrom} ${formatPrice(spot.item.preOrderPrice, locale)}` : ""}
                    </span>
                    <VoteButton startupId={spot.item.id} count={spot.item.votesCount} voted={voted.has(spot.item.id)} />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-8 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
        <TagFilter tags={tags} active={tag} params={params} />
        <div className="mt-4">
          <CatalogControls sort={sort} filters={filters} params={{ ...params, tag }} />
        </div>

        <div className="mb-3 mt-6 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {q ? fill(d.home.resultsFor, { q }) : tag ? (d.tags[tag] ?? tag) : sort === "week" ? d.home.weekTop : d.home.allProjects}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {fill(d.home.count, { n: formatNumber(result.total, locale), projects: plural(result.total, d.common.projects, locale) })}
            </p>
          </div>
          <div className="flex shrink-0 rounded-xl border border-border bg-surface p-0.5 text-xs font-semibold" role="group" aria-label={d.home.view}>
            {(["list", "grid"] as const).map((v) => (
              <Link
                key={v}
                href={catalogHref({ ...params, tag, view: v === "grid" ? "grid" : undefined })}
                aria-pressed={view === v}
                className={
                  "rounded-lg px-3 py-1.5 transition-colors " +
                  (view === v ? "bg-fg text-bg" : "text-muted hover:text-fg")
                }
              >
                {v === "list" ? d.home.viewList : d.home.viewGrid}
              </Link>
            ))}
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <div className="text-4xl">🔍</div>
            <h2 className="mt-3 text-lg font-semibold">{d.home.empty}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">{d.home.emptyText}</p>
            <div className="mt-5 flex gap-2">
              <Link href="/" className="btn-secondary">{d.home.reset}</Link>
              <Link href="/startup/new" className="btn-primary">{d.nav.add}</Link>
            </div>
          </div>
        ) : view === "list" ? (
          <div className="card divide-y divide-border/50 p-1.5 sm:p-2">
            {result.items.map((s, i) => (
              <StartupRow
                key={s.id}
                startup={s}
                voted={voted.has(s.id)}
                weekVotes={result.week.get(s.id) ?? 0}
                rank={ranked ? (page - 1) * 24 + i + 1 : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((s, i) => (
              <StartupCard
                key={s.id}
                startup={s}
                voted={voted.has(s.id)}
                rank={ranked ? (page - 1) * 24 + i + 1 : undefined}
              />
            ))}
          </div>
        )}

        <Pagination page={result.page} pages={result.pages} params={{ ...params, tag }} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="card p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <TrophyIcon className="h-4 w-4 text-warning" /> {side.byWeek ? d.home.weekTop : d.home.sidePopular}
            </h3>
            <ol className="mt-3 space-y-1">
              {side.top.map((s, i) => (
                <li key={s.id}>
                  <Link href={`/startup/${s.slug}`} className="group flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2/70">
                    <span className="w-4 text-center text-xs font-bold tabular-nums text-muted">{i + 1}</span>
                    <StartupLogo name={s.name} logoUrl={s.logoUrl} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold group-hover:text-accent">{s.name}</span>
                      <span className="block truncate text-xs text-muted">{s.shortDesc}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-muted">▲ {side.byWeek ? s.week : s.votesCount}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link href={catalogHref({ sort: "week" })} className="mt-2 block text-center text-xs font-semibold text-accent hover:underline">
              {d.home.sideAll}
            </Link>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-fg p-5 text-bg">
            <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/40 blur-2xl" />
            <h3 className="relative text-base font-bold">{d.home.claimTitle}</h3>
            <p className="relative mt-1 text-sm opacity-75">{d.home.claimText}</p>
            <Link href="/dashboard" className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-sm font-semibold text-fg hover:opacity-90">
              <GithubIcon className="h-4 w-4" /> {d.home.claimCta}
            </Link>
          </section>

          {side.collab.length > 0 && (
            <section className="card p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <HandshakeIcon className="h-4 w-4 text-violet-500" /> {d.home.sideCollab}
              </h3>
              <ul className="mt-3 space-y-1">
                {side.collab.map((s) => (
                  <li key={s.id}>
                    <Link href={`/startup/${s.slug}`} className="group flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2/70">
                      <StartupLogo name={s.name} logoUrl={s.logoUrl} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold group-hover:text-accent">{s.name}</span>
                        <span className="block truncate text-xs text-muted">{s.collabNote || s.shortDesc}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/collabs" className="mt-2 block text-center text-xs font-semibold text-accent hover:underline">
                {d.home.sideAll}
              </Link>
            </section>
          )}

          {side.joined.length > 0 && (
            <section className="card p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <UsersIcon className="h-4 w-4 text-accent" /> {d.home.sideJoined}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {side.joined.map((m) => (
                  <li key={m.startup.id} className="flex items-center gap-2.5 text-sm">
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" />
                    ) : (
                      <span className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      <Link href={`/u/${m.user.githubLogin}`} className="font-semibold hover:text-accent">@{m.user.githubLogin}</Link>
                      <span className="text-muted"> → </span>
                      <Link href={`/startup/${m.startup.slug}`} className="hover:text-accent">{m.startup.name}</Link>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{formatRelative(m.createdAt, locale)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
