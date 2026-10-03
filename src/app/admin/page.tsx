import Link from "next/link";
import { notFound } from "next/navigation";
import type { Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { displayName } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { fill, formatPrice, formatRelative } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { recomputeAllScores, setStartupStatus } from "@/app/actions/admin";
import { approveClaim, rejectClaim } from "@/app/actions/team";
import { Avatar } from "@/components/Avatar";
import { StartupLogo } from "@/components/StartupLogo";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/cn";

export function generateMetadata() {
  return { title: getI18n().d.admin.title };
}
export const dynamic = "force-dynamic";

const tabs: { key: Status }[] = [{ key: "PENDING" }, { key: "APPROVED" }, { key: "REJECTED" }];

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const { d, locale } = getI18n();
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();

  const status: Status = tabs.some((t) => t.key === searchParams.status) ? (searchParams.status as Status) : "PENDING";

  const [counts, startups, stats, claims] = await Promise.all([
    prisma.startup.groupBy({ by: ["status"], _count: true }),
    prisma.startup.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 100,
      include: { founder: { select: { username: true, firstName: true } }, tags: { select: { name: true } } },
    }),
    prisma.preOrder.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.claimRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        startup: { select: { name: true, slug: true, githubUrl: true, _count: { select: { members: true } } } },
        user: { select: { username: true, firstName: true, avatarUrl: true, githubLogin: true } },
      },
    }),
  ]);
  const countOf = (s: Status) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{d.admin.title}</h1>
        <form action={recomputeAllScores}>
          <button type="submit" className="btn-secondary btn-sm">{d.admin.recompute}</button>
        </form>
      </div>
      <p className="mt-1 text-sm text-muted">
        {fill(d.admin.paidStats, { n: stats._count, sum: formatPrice(stats._sum.amount ?? 0, locale) })}
      </p>

      {claims.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">{fill(d.admin.claims, { n: claims.length })}</h2>
          <div className="card divide-y divide-border/60">
            {claims.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar user={c.user} size={36} />
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold">
                      {c.user.firstName ?? displayName(c.user)}
                      {c.user.githubLogin ? (
                        <a href={`https://github.com/${c.user.githubLogin}`} target="_blank" rel="noreferrer" className="ml-1 font-normal text-accent">@{c.user.githubLogin}</a>
                      ) : (
                        <span className="ml-1 font-normal text-muted">{d.admin.withoutGithub}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      → <Link href={`/startup/${c.startup.slug}`} className="hover:text-fg">{c.startup.name}</Link>
                      {c.startup.githubUrl && (
                        <> · <a href={`${c.startup.githubUrl}/graphs/contributors`} target="_blank" rel="noreferrer" className="hover:text-fg">{d.admin.contributors}</a></>
                      )}
                      {" "}· {fill(d.admin.inTeam, { n: c.startup._count.members })} · {formatRelative(c.createdAt, locale)}
                    </div>
                    {c.message && <p className="mt-1">«{c.message}»</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveClaim.bind(null, c.id)}>
                    <button className="btn-primary btn-sm" type="submit">{d.dashboard.accept}</button>
                  </form>
                  <form action={rejectClaim.bind(null, c.id)}>
                    <button className="btn-secondary btn-sm" type="submit">{d.dashboard.reject}</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin?status=${t.key}`}
            className={cn("chip", status === t.key ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
          >
            {d.admin.tabs[t.key]} · {countOf(t.key)}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {startups.length === 0 && <div className="card p-6 text-center text-sm text-muted">{d.admin.empty} 🎉</div>}
        {startups.map((s) => (
          <div key={s.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <StartupLogo name={s.name} logoUrl={s.logoUrl} size={44} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/startup/${s.slug}`} className="font-semibold hover:text-accent">{s.name}</Link>
                  <StatusPill status={s.status} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.shortDesc}</p>
                <div className="mt-1 text-xs text-muted">
                  {displayName(s.founder)} · {formatRelative(s.createdAt, locale)}
                  {s.preOrderEnabled && ` · ${formatPrice(s.preOrderPrice, locale)}`}
                  {s.tags.length > 0 && ` · ${s.tags.map((t) => tTag(d, t.name)).join(", ")}`}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {s.status !== "APPROVED" && (
                <form action={setStartupStatus.bind(null, s.id, "APPROVED")}>
                  <button className="btn-primary btn-sm" type="submit">{d.admin.approve}</button>
                </form>
              )}
              {s.status !== "REJECTED" && (
                <form action={setStartupStatus.bind(null, s.id, "REJECTED")}>
                  <button className="btn-secondary btn-sm text-danger" type="submit">{d.admin.reject}</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
