import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { latestJobs, openJobsCount } from "@/lib/jobs";
import { catalogStats, startupCardSelect, userVotes } from "@/lib/queries";
import { getI18n } from "@/i18n/server";
import { fill, formatNumber } from "@/i18n/format";
import { JobCard } from "@/components/JobCard";
import { StartupRow } from "@/components/StartupRow";
import { PlusIcon, SparkIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const { d } = getI18n();
  return { title: d.biz.heroTitle, description: d.biz.noFee };
}

export default async function BusinessPage() {
  const { d, locale } = getI18n();
  const user = await getCurrentUser();
  const [stats, jobsOpen, jobs, solutions] = await Promise.all([
    catalogStats(),
    openJobsCount(),
    latestJobs(4),
    prisma.startup.findMany({
      where: { status: "APPROVED", OR: [{ implPrice: { not: null } }, { members: { some: {} } }] },
      orderBy: [{ score: "desc" }, { votesCount: "desc" }],
      take: 5,
      select: startupCardSelect,
    }),
  ]);
  const solutionsFinal =
    solutions.length >= 3
      ? solutions
      : await prisma.startup.findMany({ where: { status: "APPROVED" }, orderBy: [{ score: "desc" }], take: 5, select: startupCardSelect });
  const voted = await userVotes(user?.id, solutionsFinal.map((s) => s.id));

  return (
    <div>
      {/* ---------- Герой ---------- */}
      <section className="relative overflow-hidden border-b border-border/60 bg-fg text-bg">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg/10 px-3 py-1 text-xs font-semibold">
              <SparkIcon className="h-3.5 w-3.5" /> {d.biz.heroKicker}
            </span>
            <h1 className="mt-4 max-w-2xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">{d.biz.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-base opacity-75 sm:text-lg">
              {fill(d.biz.heroText, { n: formatNumber(stats.projects, locale) })}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-lg shadow-accent/30 hover:opacity-90">
                <PlusIcon className="h-4 w-4" /> {d.biz.ctaPost}
              </Link>
              <Link href="/" className="inline-flex items-center rounded-xl bg-bg/10 px-6 py-3 font-semibold hover:bg-bg/15">
                {d.biz.ctaBrowse}
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                [stats.projects, d.biz.statProjects],
                [stats.developers, d.biz.statDevs],
                [jobsOpen, d.biz.statJobs],
              ].map(([v, l]) => (
                <div key={String(l)}>
                  <dt className="text-2xl font-extrabold tabular-nums">{formatNumber(Number(v), locale)}</dt>
                  <dd className="text-xs opacity-60">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="self-center rounded-3xl bg-bg/[0.06] p-5 ring-1 ring-bg/10 backdrop-blur">
            <div className="text-sm font-semibold opacity-80">{d.biz.ideasTitle}</div>
            <ul className="mt-3 space-y-2">
              {d.biz.ideas.map((idea) => (
                <li key={idea}>
                  <Link
                    href={`/jobs/new?title=${encodeURIComponent(idea)}`}
                    className="group flex items-center justify-between gap-3 rounded-xl bg-bg/[0.06] px-4 py-3 text-sm transition-colors hover:bg-bg/[0.12]"
                  >
                    <span>{idea}</span>
                    <span aria-hidden className="opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Как это работает ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">{d.biz.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {d.biz.steps.map((s, i) => (
            <li key={s.t} className="card relative overflow-hidden p-6">
              <span aria-hidden className="absolute -right-2 -top-6 text-8xl font-black text-fg/[0.04]">{i + 1}</span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-sm font-bold text-accent">{i + 1}</span>
              <h3 className="mt-4 font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.x}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">{d.biz.noFee}</p>
      </section>

      {/* ---------- Заказы и готовые решения ---------- */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-xl font-bold tracking-tight">{d.jobs.latest}</h2>
            <Link href="/jobs" className="text-sm font-semibold text-accent hover:underline">{d.jobs.seeAll}</Link>
          </div>
          {jobs.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <p className="text-sm text-muted">{d.jobs.emptyText}</p>
              <Link href="/jobs/new" className="btn-primary mt-4">{d.biz.ctaPost}</Link>
            </div>
          ) : (
            <div className="card divide-y divide-border/50 p-1.5">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{d.biz.solutionsTitle}</h2>
              <p className="text-sm text-muted">{d.biz.solutionsText}</p>
            </div>
            <Link href="/" className="shrink-0 text-sm font-semibold text-accent hover:underline">{d.home.sideAll}</Link>
          </div>
          <div className="card divide-y divide-border/50 p-1.5">
            {solutionsFinal.map((s) => (
              <StartupRow key={s.id} startup={s} voted={voted.has(s.id)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
