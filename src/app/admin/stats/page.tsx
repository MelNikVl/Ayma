import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.stats.title };
}

type Row = { key: string | null; views: number; visitors: number };

const DAYS = 30;

async function grouped(column: "path" | "referrer" | "device" | "locale" | "utmSource", since: Date, limit = 15): Promise<Row[]> {
  // имя колонки берётся из фиксированного списка выше — инъекция невозможна
  const rows = await prisma.$queryRawUnsafe<{ key: string | null; views: bigint; visitors: bigint }[]>(
    `SELECT "${column}" AS key, count(*) AS views, count(DISTINCT visitor) AS visitors
       FROM "PageView" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT ${limit}`,
    since,
  );
  return rows.map((r) => ({ key: r.key, views: Number(r.views), visitors: Number(r.visitors) }));
}

export default async function StatsPage() {
  const { d, locale } = getI18n();
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();

  const since = new Date(Date.now() - DAYS * 24 * 3600 * 1000);
  


  const [daily, totals, today, pages, refs, devices, langs, utm, funnel] = await Promise.all([
    prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
      SELECT to_char(("createdAt" + interval '5 hours')::date, 'YYYY-MM-DD') AS day,
             count(*) AS views, count(DISTINCT visitor) AS visitors
        FROM "PageView" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ views: bigint; visitors: bigint }[]>`
      SELECT count(*) AS views, count(DISTINCT visitor) AS visitors FROM "PageView" WHERE "createdAt" >= ${since}`,
    prisma.$queryRaw<{ views: bigint; visitors: bigint }[]>`
      SELECT count(*) AS views, count(DISTINCT visitor) AS visitors FROM "PageView"
       WHERE ("createdAt" + interval '5 hours')::date = (now() + interval '5 hours')::date`,
    grouped("path", since, 20),
    grouped("referrer", since),
    grouped("device", since, 5),
    grouped("locale", since, 5),
    prisma.$queryRaw<{ src: string | null; med: string | null; camp: string | null; visitors: bigint }[]>`
      SELECT "utmSource" AS src, "utmMedium" AS med, "utmCampaign" AS camp, count(DISTINCT visitor) AS visitors
        FROM "PageView" WHERE "createdAt" >= ${since} AND "utmSource" IS NOT NULL
       GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT 15`,
    Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.startupMember.count({ where: { createdAt: { gte: since } } }),
      prisma.vote.count({ where: { createdAt: { gte: since } } }),
      prisma.preOrder.count({ where: { createdAt: { gte: since } } }),
      prisma.preOrder.count({ where: { createdAt: { gte: since }, status: "PAID" } }),
      prisma.collabRequest.count({ where: { createdAt: { gte: since } } }),
    ]),
  ]);


  // заполняем пропущенные дни нулями
  const byDay = new Map(daily.map((r) => [r.day, { views: Number(r.views), visitors: Number(r.visitors) }]));
  const days: { day: string; views: number; visitors: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const dt = new Date(Date.now() + 5 * 3600 * 1000 - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    days.push({ day: dt, ...(byDay.get(dt) ?? { views: 0, visitors: 0 }) });
  }
  const max = Math.max(1, ...days.map((x) => x.visitors));
  const total = { views: Number(totals[0]?.views ?? 0), visitors: Number(totals[0]?.visitors ?? 0) };
  const todayT = { views: Number(today[0]?.views ?? 0), visitors: Number(today[0]?.visitors ?? 0) };
  const n = (v: number) => formatNumber(v, locale);
  const [newUsers, claims, votes, preorders, paid, collabs] = funnel;

  const tiles: [string, number][] = [
    [d.stats.visitors, total.visitors],
    [d.stats.views, total.views],
    [`${d.stats.today}: ${d.stats.visitors.toLowerCase()}`, todayT.visitors],
    [d.stats.newUsers, newUsers],
    [d.stats.claims, claims],
    [d.stats.votes, votes],
    [d.stats.preorders, preorders],
    [d.stats.paid, paid],
    [d.stats.collabs, collabs],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{d.stats.title}</h1>
          <p className="mt-1 text-sm text-muted">{d.stats.period} · {d.stats.privacy}</p>
        </div>
        <Link href="/admin" className="btn-secondary btn-sm">← {d.admin.title}</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-muted">{label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{n(value)}</div>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-bold">{d.stats.perDay}</h2>
        <div className="flex h-48 items-end gap-[2px]" role="img" aria-label={d.stats.perDay}>
          {days.map((x) => (
            <div key={x.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80"
                style={{ height: `${(x.visitors / max) * 100}%`, minHeight: x.visitors ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs text-bg shadow-card group-hover:block">
                {x.day}: {n(x.visitors)} {d.stats.visitors.toLowerCase()} · {n(x.views)} {d.stats.views.toLowerCase()}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted tabular-nums">
          <span>{days[0]?.day}</span>
          <span>{days[days.length - 1]?.day}</span>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted">{d.stats.table}</summary>
          <table className="mt-2 w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted">
              <tr><th className="py-1">{d.stats.date}</th><th>{d.stats.visitors}</th><th>{d.stats.views}</th></tr>
            </thead>
            <tbody>
              {days.slice().reverse().map((x) => (
                <tr key={x.day} className="border-t border-border/60"><td className="py-1">{x.day}</td><td>{x.visitors}</td><td>{x.views}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankTable title={d.stats.topPages} rows={pages} d={d} n={n} link />
        <RankTable title={d.stats.referrers} rows={refs.map((r) => ({ ...r, key: r.key ?? d.stats.direct }))} d={d} n={n} />
        <section className="card p-5">
          <h2 className="mb-3 font-bold">{d.stats.utm}</h2>
          {utm.length === 0 ? (
            <p className="text-sm text-muted">{d.stats.empty}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {utm.map((u, i) => (
                  <tr key={i} className="border-t border-border/60 first:border-0">
                    <td className="py-1.5 font-mono text-xs">{[u.src, u.med, u.camp].filter(Boolean).join(" / ")}</td>
                    <td className="text-right tabular-nums">{n(Number(u.visitors))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <div className="grid gap-6 sm:grid-cols-2">
          <RankTable title={d.stats.devices} rows={devices} d={d} n={n} />
          <RankTable title={d.stats.languages} rows={langs.map((r) => ({ ...r, key: r.key?.toUpperCase() ?? "—" }))} d={d} n={n} />
        </div>
      </div>
    </div>
  );
}

function RankTable({
  title,
  rows,
  d,
  n,
  link,
}: {
  title: string;
  rows: Row[];
  d: ReturnType<typeof getI18n>["d"];
  n: (v: number) => string;
  link?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <section className="card p-5">
      <div className="mb-3 flex justify-between text-xs text-muted">
        <h2 className="text-base font-bold text-fg">{title}</h2>
        <span>{d.stats.visitors}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{d.stats.empty}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key ?? "—"} className="relative flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm" title={`${n(r.views)} ${d.stats.views.toLowerCase()}`}>
              <span className="absolute inset-y-0 left-0 rounded-md bg-accent/10" style={{ width: `${(r.visitors / max) * 100}%` }} />
              {link && r.key ? (
                <Link href={r.key} className="relative min-w-0 truncate hover:text-accent">{r.key}</Link>
              ) : (
                <span className="relative min-w-0 truncate">{r.key ?? "—"}</span>
              )}
              <span className="relative tabular-nums">{n(r.visitors)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
