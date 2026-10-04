import Link from "next/link";
import { redirect } from "next/navigation";
import { myJobResponses, myJobs } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MAX_MEMBERS } from "@/lib/access";
import { displayName } from "@/lib/format";
import { levelFor } from "@/lib/levels";
import { getI18n } from "@/i18n/server";
import { fill, formatCompact, formatPrice, formatRelative, plural } from "@/i18n/format";
import { refreshGithub } from "@/app/actions/startup";
import { cancelMyPreOrder, setPreOrderStatus } from "@/app/actions/preorder";
import { approveClaim, rejectClaim, removeMember } from "@/app/actions/team";
import { respondCollab } from "@/app/actions/collab";
import { StartupLogo } from "@/components/StartupLogo";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { ScorePill, ScoreRing } from "@/components/ScoreBadge";
import { ProfileForm } from "@/components/ProfileForm";
import { ResumeUploader } from "@/components/ResumeUploader";
import { SubmitButton } from "@/components/SubmitButton";
import { setInvestStatus } from "@/app/actions/invest";
import { profileHref } from "@/components/UserMenu";
import { GithubIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.dashboard.title };
}

export default async function DashboardPage() {
  const { d, locale } = getI18n();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [me, memberships] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { bio: true, skills: true, contactUrl: true, linkedinUrl: true, resumeUrl: true, resumeName: true, openToCollab: true, score: true, firstName: true },
    }),
    prisma.startupMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        role: true,
        startup: {
          select: {
            id: true, slug: true, name: true, logoUrl: true, status: true, viewsCount: true, score: true, votesCount: true,
            githubUrl: true, preOrderEnabled: true, preOrderPrice: true, preOrderGoal: true,
            preOrders: { where: { status: "PAID" }, select: { amount: true } },
            members: {
              orderBy: { createdAt: "asc" },
              select: { id: true, role: true, userId: true, user: { select: { username: true, firstName: true, avatarUrl: true, githubLogin: true } } },
            },
          },
        },
      },
    }),
  ]);
  const myStartupIds = memberships.map((m) => m.startup.id);

  const [incoming, mine, teamClaims, myClaims, collabIn, collabOut] = await Promise.all([
    prisma.preOrder.findMany({
      where: { startupId: { in: myStartupIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { startup: { select: { name: true, slug: true } }, sponsor: { select: { username: true, firstName: true, avatarUrl: true } } },
    }),
    prisma.preOrder.findMany({
      where: { sponsorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { startup: { select: { name: true, slug: true, logoUrl: true } } },
    }),
    prisma.claimRequest.findMany({
      where: { startupId: { in: myStartupIds }, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { startup: { select: { name: true, slug: true } }, user: { select: { username: true, firstName: true, avatarUrl: true, githubLogin: true } } },
    }),
    prisma.claimRequest.findMany({
      where: { userId: user.id, status: { not: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      include: { startup: { select: { name: true, slug: true, logoUrl: true } } },
    }),
    prisma.collabRequest.findMany({
      where: { OR: [{ toUserId: user.id }, { toStartupId: { in: myStartupIds } }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        fromUser: { select: { id: true, username: true, firstName: true, avatarUrl: true, githubLogin: true } },
        fromStartup: { select: { name: true, slug: true } },
        toStartup: { select: { name: true, slug: true } },
      },
    }),
    prisma.collabRequest.findMany({
      where: { fromUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        toStartup: { select: { name: true, slug: true } },
        toUser: { select: { id: true, username: true, firstName: true, githubLogin: true } },
      },
    }),
  ]);

  const [jobsMine, jobResps, investIn, investOut] = await Promise.all([
    myJobs(user.id),
    myJobResponses(user.id),
    prisma.investInterest.findMany({
      where: { startup: { members: { some: { userId: user.id } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, firstName: true, username: true, avatarUrl: true, githubLogin: true, linkedinUrl: true } },
        startup: { select: { name: true, slug: true } },
      },
    }),
    prisma.investInterest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { startup: { select: { name: true, slug: true, logoUrl: true } } },
    }),
  ]);
  const pendingIncoming = incoming.filter((o) => o.status === "PENDING").length;
  const collabStatus = (s: string) => (s === "ACCEPTED" ? d.collab.accepted : s === "DECLINED" ? d.collab.declined : d.collab.pending);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Профиль */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar user={user} size={56} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{me.firstName ?? displayName(user)}</h1>
            <p className="text-sm text-muted">
              {user.githubLogin ? (
                <a href={`https://github.com/${user.githubLogin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <GithubIcon className="h-3.5 w-3.5" /> {user.githubLogin}
                </a>
              ) : (
                d.dashboard.noGithub
              )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:ml-4">
            <ScoreRing score={me.score} size={48} label={d.dashboard.myScore} />
            <div className="hidden text-xs sm:block">
              <div className="text-muted">{d.dashboard.myScore}</div>
              <div className="font-semibold">{d.score.levels[levelFor(me.score)]}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!user.githubLogin && (
            <a href="/api/auth/github?next=/dashboard" className="btn-secondary">
              <GithubIcon className="h-4 w-4" /> {d.dashboard.linkGithub}
            </a>
          )}
          <Link href={profileHref(user)} className="btn-secondary">{d.dashboard.viewProfile}</Link>
          <Link href="/startup/new" className="btn-primary">{d.dashboard.add}</Link>
        </div>
      </div>

      {/* Инвесторы: заявки в мои проекты */}
      {(memberships.length > 0 || investIn.length > 0) && (
        <section id="investors">
          <h2 className="mb-3 text-lg font-bold">
            {d.invest.dashTitle} <span className="font-normal text-muted">{investIn.length}</span>
          </h2>
          {investIn.length === 0 ? (
            <div className="card p-5 text-sm text-muted">{d.invest.dashEmpty}</div>
          ) : (
            <ul className="space-y-3">
              {investIn.map((r) => (
                <li key={r.id} className={"card p-4 " + (r.status === "DECLINED" ? "opacity-60" : "")}>
                  <div className="flex flex-wrap items-start gap-3">
                    <Link href={profileHref(r.user)} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar user={r.user} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:text-accent">{r.user.firstName ?? displayName(r.user)}</span>
                        <span className="text-xs text-muted">
                          → {r.startup.name} · {formatRelative(r.createdAt, locale)}
                        </span>
                      </span>
                    </Link>
                    <div className="text-right">
                      <div className="text-lg font-extrabold tabular-nums">{formatPrice(r.amount, locale)}</div>
                      <div className="text-xs text-muted">{d.invest.formats[r.format as keyof typeof d.invest.formats] ?? r.format}</div>
                    </div>
                  </div>
                  {r.message && <p className="mt-3 whitespace-pre-line text-sm">{r.message}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold">{d.invest.status[r.status]}</span>
                      <span className="break-all font-semibold">{r.contact}</span>
                      {r.user.linkedinUrl && (
                        <a href={r.user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">LinkedIn</a>
                      )}
                    </span>
                    {r.status === "NEW" && (
                      <span className="flex gap-2">
                        <form action={setInvestStatus.bind(null, r.id, "DECLINED")}>
                          <SubmitButton variant="secondary" className="btn-sm">{d.invest.decline}</SubmitButton>
                        </form>
                        <form action={setInvestStatus.bind(null, r.id, "IN_TALKS")}>
                          <SubmitButton className="btn-sm">{d.invest.talk}</SubmitButton>
                        </form>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {investOut.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{d.invest.myTitle}</h2>
          <div className="card divide-y divide-border/50 p-1.5">
            {investOut.map((r) => (
              <Link key={r.id} href={`/startup/${r.startup.slug}/invest`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-2/70">
                <StartupLogo name={r.startup.name} logoUrl={r.startup.logoUrl} size={32} />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.startup.name}</span>
                <span className="font-bold tabular-nums">{formatPrice(r.amount, locale)}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold">{d.invest.status[r.status]}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Биржа: мои задачи и отклики */}
      <section className="grid gap-6 lg:grid-cols-2" id="jobs">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{d.jobs.myJobs}</h2>
            <Link href="/jobs/new" className="text-sm font-semibold text-accent hover:underline">+ {d.jobs.post}</Link>
          </div>
          {jobsMine.length === 0 ? (
            <div className="card p-5 text-sm text-muted">{d.jobs.noMyJobs}</div>
          ) : (
            <div className="card divide-y divide-border/50 p-1.5">
              {jobsMine.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-2/70">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{j.title}</span>
                    <span className="text-xs text-muted">{d.jobs.status[j.status]} · {formatRelative(j.createdAt, locale)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold tabular-nums text-accent">
                    {j.responsesCount} {plural(j.responsesCount, d.jobs.respForms, locale)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{d.jobs.myResponses}</h2>
            <Link href="/jobs" className="text-sm font-semibold text-accent hover:underline">{d.jobs.seeAll}</Link>
          </div>
          {jobResps.length === 0 ? (
            <div className="card p-5 text-sm text-muted">{d.jobs.noMyResponses}</div>
          ) : (
            <div className="card divide-y divide-border/50 p-1.5">
              {jobResps.map((r) => (
                <Link key={r.id} href={`/jobs/${r.job.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-surface-2/70">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.job.title}</span>
                    <span className="text-xs text-muted">
                      {r.price ? `${formatPrice(r.price, locale)} · ` : ""}
                      {formatRelative(r.createdAt, locale)}
                    </span>
                  </span>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold " +
                      (r.status === "ACCEPTED" ? "bg-success/15 text-success" : r.status === "DECLINED" ? "bg-fg/5 text-muted" : "bg-accent/10 text-accent")
                    }
                  >
                    {d.jobs.rstatus[r.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Мои проекты */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{d.dashboard.myProjects}</h2>
        {memberships.length === 0 ? (
          <div className="card p-6 text-sm text-muted">
            <p>{d.dashboard.noProjects}</p>
            <p className="mt-2">{d.dashboard.noProjectsHelp}</p>
            <Link href="/" className="btn-secondary mt-4">{d.dashboard.findProject}</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {memberships.map(({ role, startup: s }) => {
              const raised = s.preOrders.reduce((sum, p) => sum + p.amount, 0);
              return (
                <li key={s.id} className="card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <StartupLogo name={s.name} logoUrl={s.logoUrl} size={48} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/startup/${s.slug}`} className="truncate font-semibold hover:text-accent">{s.name}</Link>
                          <StatusPill status={s.status} />
                          <ScorePill score={s.score} />
                          <span className="text-[11px] text-muted">{role === "OWNER" ? d.dashboard.owner : d.dashboard.member}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          👁 {formatCompact(s.viewsCount)} · ▲ {s.votesCount} ·{" "}
                          {s.preOrderEnabled ? fill(d.dashboard.preorderOn, { price: formatPrice(s.preOrderPrice, locale) }) : d.dashboard.preorderOff} ·{" "}
                          {fill(d.dashboard.raised, { sum: formatPrice(raised, locale) })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.githubUrl && (
                        <form action={refreshGithub.bind(null, s.id)}>
                          <button className="btn-secondary btn-sm" type="submit">{d.dashboard.refreshGithub}</button>
                        </form>
                      )}
                      <Link href={`/startup/${s.slug}/edit`} className="btn-primary btn-sm">{d.dashboard.editCard}</Link>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="mb-2 text-xs font-medium text-muted">{fill(d.dashboard.team, { n: s.members.length })}</div>
                    <ul className="flex flex-wrap gap-2">
                      {s.members.map((m) => {
                        const self = m.userId === user.id;
                        const canRemove = self || role === "OWNER" || user.role === "ADMIN";
                        return (
                          <li key={m.id} className="flex items-center gap-2 rounded-lg bg-surface-2 py-1 pl-1 pr-2 text-sm">
                            <Avatar user={m.user} size={24} />
                            <span>{m.user.firstName ?? displayName(m.user)}{self && ` (${d.dashboard.you})`}</span>
                            {m.role === "OWNER" && <span className="text-[11px] text-muted">{d.dashboard.owner}</span>}
                            {canRemove && (
                              <form action={removeMember.bind(null, m.id)}>
                                <button type="submit" className="text-xs text-danger hover:underline">{self ? d.dashboard.leave : d.dashboard.remove}</button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {teamClaims.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">
            {d.dashboard.claims} <span className="ml-1 rounded-full bg-accent px-2 py-0.5 align-middle text-xs text-white">{teamClaims.length}</span>
          </h2>
          <div className="card divide-y divide-border/60">
            {teamClaims.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar user={c.user} size={36} />
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold">
                      {c.user.firstName ?? displayName(c.user)}
                      {c.user.githubLogin && <span className="ml-1 font-normal text-muted">@{c.user.githubLogin}</span>}
                    </div>
                    <div className="text-xs text-muted">{fill(d.dashboard.wantsIn, { name: c.startup.name })} · {formatRelative(c.createdAt, locale)}</div>
                    {c.message && <p className="mt-1 text-sm">«{c.message}»</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveClaim.bind(null, c.id)}><button className="btn-primary btn-sm" type="submit">{d.dashboard.accept}</button></form>
                  <form action={rejectClaim.bind(null, c.id)}><button className="btn-secondary btn-sm" type="submit">{d.dashboard.reject}</button></form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {myClaims.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{d.dashboard.myClaims}</h2>
          <div className="card divide-y divide-border/60">
            {myClaims.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
                <StartupLogo name={c.startup.name} logoUrl={c.startup.logoUrl} size={32} />
                <Link href={`/startup/${c.startup.slug}`} className="min-w-0 flex-1 truncate font-semibold hover:text-accent">{c.startup.name}</Link>
                <span className={c.status === "REJECTED" ? "text-danger" : "text-warning"}>
                  {c.status === "REJECTED" ? d.dashboard.claimRejected : d.dashboard.claimPending}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Коллаборации */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold">{d.collab.inbox}</h2>
          {collabIn.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">{d.collab.empty}</div>
          ) : (
            <div className="card divide-y divide-border/60">
              {collabIn.map((c) => (
                <div key={c.id} className="space-y-2 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar user={c.fromUser} size={28} />
                    <Link href={profileHref(c.fromUser)} className="font-semibold hover:text-accent">{c.fromUser.firstName ?? displayName(c.fromUser)}</Link>
                    {c.fromStartup && <span className="text-muted">· {c.fromStartup.name}</span>}
                    <span className="ml-auto text-xs text-muted">{formatRelative(c.createdAt, locale)}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {d.collab.kinds[c.kind as keyof typeof d.collab.kinds] ?? c.kind}
                    {c.toStartup && <> → {c.toStartup.name}</>}
                  </div>
                  <p className="whitespace-pre-line">{c.message}</p>
                  {c.contact && <p className="text-xs"><b>{d.collab.contact}:</b> {c.contact}</p>}
                  {c.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <form action={respondCollab.bind(null, c.id, true)}><button className="btn-primary btn-sm" type="submit">{d.collab.accept}</button></form>
                      <form action={respondCollab.bind(null, c.id, false)}><button className="btn-secondary btn-sm" type="submit">{d.collab.decline}</button></form>
                    </div>
                  ) : (
                    <span className={c.status === "ACCEPTED" ? "text-xs font-semibold text-success" : "text-xs text-muted"}>{collabStatus(c.status)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">{d.collab.outbox}</h2>
          {collabOut.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">{d.collab.empty}</div>
          ) : (
            <div className="card divide-y divide-border/60">
              {collabOut.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {c.toStartup ? (
                      <Link href={`/startup/${c.toStartup.slug}`} className="font-semibold hover:text-accent">{c.toStartup.name}</Link>
                    ) : c.toUser ? (
                      <Link href={profileHref(c.toUser)} className="font-semibold hover:text-accent">{c.toUser.firstName ?? displayName(c.toUser)}</Link>
                    ) : null}
                    <span className="ml-1 text-xs text-muted">· {d.collab.kinds[c.kind as keyof typeof d.collab.kinds] ?? c.kind}</span>
                  </span>
                  <span className={c.status === "ACCEPTED" ? "text-xs font-semibold text-success" : c.status === "DECLINED" ? "text-xs text-danger" : "text-xs text-warning"}>
                    {collabStatus(c.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {memberships.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">
            {d.dashboard.incoming}
            {pendingIncoming > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-xs text-white">{pendingIncoming}</span>}
          </h2>
          {incoming.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">{d.dashboard.noIncoming}</div>
          ) : (
            <div className="card divide-y divide-border/60">
              {incoming.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar user={o.sponsor} size={36} />
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{displayName(o.sponsor)}</span>
                        <StatusPill status={o.status} kind="payment" />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {o.startup.name} · {fill(d.dashboard.pcs, { n: o.quantity })} · {fill(d.dashboard.contact, { c: o.contactInfo ?? "—" })} · {formatRelative(o.createdAt, locale)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mr-2 font-bold tabular-nums">{formatPrice(o.amount, locale)}</span>
                    {o.status === "PENDING" && (
                      <>
                        <form action={setPreOrderStatus.bind(null, o.id, "PAID")}><button className="btn-primary btn-sm" type="submit">{d.dashboard.markPaid}</button></form>
                        <form action={setPreOrderStatus.bind(null, o.id, "CANCELED")}><button className="btn-secondary btn-sm" type="submit">{d.dashboard.cancel}</button></form>
                      </>
                    )}
                    {o.status === "PAID" && (
                      <form action={setPreOrderStatus.bind(null, o.id, "PENDING")}><button className="btn-ghost btn-sm text-muted" type="submit">{d.dashboard.backToPending}</button></form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">{d.dashboard.myOrders}</h2>
        {mine.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            {d.dashboard.noOrders} <Link href="/" className="text-accent hover:underline">{d.dashboard.toCatalog}</Link>.
          </div>
        ) : (
          <div className="card divide-y divide-border/60">
            {mine.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <StartupLogo name={o.startup.name} logoUrl={o.startup.logoUrl} size={36} />
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/startup/${o.startup.slug}`} className="font-semibold hover:text-accent">{o.startup.name}</Link>
                      <StatusPill status={o.status} kind="payment" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{fill(d.dashboard.pcs, { n: o.quantity })} · {formatRelative(o.createdAt, locale)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-2 font-bold tabular-nums">{formatPrice(o.amount, locale)}</span>
                  {o.status === "PENDING" && o.paymentLink && (
                    <a href={o.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">{d.dashboard.pay}</a>
                  )}
                  {o.status === "PENDING" && (
                    <form action={cancelMyPreOrder.bind(null, o.id)}><button className="btn-secondary btn-sm" type="submit">{d.dashboard.cancel}</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Профиль разработчика */}
      <section className="card p-5 sm:p-6" id="profile">
        <h2 className="text-lg font-bold">{d.dashboard.profile}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{d.dashboard.profileText}</p>
        <ProfileForm
          defaults={{
            firstName: me.firstName ?? displayName(user),
            bio: me.bio ?? "",
            skills: me.skills.join(", "),
            contactUrl: me.contactUrl ?? "",
            linkedinUrl: me.linkedinUrl ?? "",
            openToCollab: me.openToCollab,
          }}
        />
        <div className="mt-5">
          <ResumeUploader url={me.resumeUrl} name={me.resumeName} />
        </div>
      </section>
    </div>
  );
}
