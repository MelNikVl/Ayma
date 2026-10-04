import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getJob } from "@/lib/jobs";
import { displayName } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { fill, formatPrice, formatRelative, plural } from "@/i18n/format";
import type { Dict } from "@/i18n/dictionaries";
import { decideJobResponse, setJobStatus, toggleJobHidden, withdrawJobResponse } from "@/app/actions/jobs";
import { JobStatusPill, jobBudget } from "@/components/JobCard";
import { JobRespondForm } from "@/components/JobRespondForm";
import { Avatar } from "@/components/Avatar";
import { StartupLogo } from "@/components/StartupLogo";
import { ScorePill } from "@/components/ScoreBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { profileHref } from "@/components/UserMenu";
import { ClockIcon, CoinsIcon, EyeIcon, GithubIcon, TelegramIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { title: true, description: true, hidden: true } });
  if (!job || job.hidden) return { title: getI18n().d.jobs.boardTitle };
  return { title: job.title, description: job.description.slice(0, 160) };
}

function contactHref(v: string): string | null {
  const s = v.trim();
  if (/^@?[a-zA-Z0-9_]{5,32}$/.test(s)) return `https://t.me/${s.replace(/^@/, "")}`;
  if (/^https?:\/\//.test(s)) return s;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `mailto:${s}`;
  if (/^\+?[\d\s()-]{7,}$/.test(s)) return `tel:${s.replace(/[^\d+]/g, "")}`;
  return null;
}

function ContactLine({ value }: { value: string }) {
  const href = contactHref(value);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-accent hover:underline">{value}</a>
  ) : (
    <span className="break-all font-semibold">{value}</span>
  );
}

export default async function JobPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const { d, locale } = getI18n();
  const [job, user] = await Promise.all([getJob(params.id), getCurrentUser()]);
  if (!job) notFound();

  const isAuthor = user?.id === job.authorId;
  const isAdmin = user?.role === "ADMIN";
  const canManage = isAuthor || isAdmin;
  if (job.hidden && !canManage) notFound();

  if (!isAuthor) await prisma.job.update({ where: { id: job.id }, data: { viewsCount: { increment: 1 } } });

  const mine = user ? job.responses.find((r) => r.userId === user.id) : undefined;
  const myStartups =
    user && !isAuthor && !mine
      ? await prisma.startup.findMany({ where: { members: { some: { userId: user.id } } }, select: { id: true, name: true } })
      : [];
  const company = job.company ?? job.author.company;
  const authorTg = job.author.username && job.author.telegramId && job.author.telegramId > 0n ? job.author.username : null;
  const selfHref = `/jobs/${job.id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/jobs" className="text-sm text-muted hover:text-fg">{d.jobs.back}</Link>

      {searchParams.created && isAuthor && (
        <div role="status" className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">{d.jobs.created}</div>
      )}
      {job.hidden && <div className="mt-4 rounded-xl bg-warning/10 px-4 py-3 text-sm">{d.jobs.hiddenNote}</div>}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------- Задача ---------- */}
        <div className="min-w-0 space-y-6">
          <article className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <JobStatusPill status={job.status} d={d} />
              {company && <span className="font-semibold text-fg">{company}</span>}
              <span>{fill(d.jobs.posted, { date: formatRelative(job.createdAt, locale) })}</span>
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="h-3.5 w-3.5" /> {job.viewsCount}
              </span>
            </div>
            <h1 className="mt-3 text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">{job.title}</h1>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="flex items-center gap-1 text-xs text-muted"><CoinsIcon className="h-3.5 w-3.5" /> {d.jobs.budget}</dt>
                <dd className="mt-1 font-bold tabular-nums">{jobBudget(job, d, locale)}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="flex items-center gap-1 text-xs text-muted"><ClockIcon className="h-3.5 w-3.5" /> {d.jobs.deadline}</dt>
                <dd className="mt-1 font-bold tabular-nums">{job.deadlineDays ? fill(d.jobs.days, { n: job.deadlineDays }) : "—"}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-surface-2 p-3 sm:col-span-1">
                <dt className="text-xs text-muted">{d.jobs.responsesTitle}</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {job.responsesCount} {plural(job.responsesCount, d.jobs.respForms, locale)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.categories.map((c) => (
                <Link key={c} href={`/jobs?cat=${c}`} className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted hover:text-fg">
                  {d.jobs.cat[c as keyof Dict["jobs"]["cat"]] ?? c}
                </Link>
              ))}
            </div>

            <div className="mt-6 whitespace-pre-line border-t border-border/60 pt-6 leading-relaxed">{job.description}</div>
          </article>

          {canManage && (
            <section className="card p-5 sm:p-7">
              <h2 className="mb-4 text-lg font-bold">
                {d.jobs.responsesTitle} <span className="font-normal text-muted">{job.responses.length}</span>
              </h2>
              {job.responses.length === 0 ? (
                <p className="text-sm text-muted">{d.jobs.noResponses}</p>
              ) : (
                <ul className="space-y-4">
                  {job.responses.map((r) => {
                    const tg = r.user.username && r.user.telegramId && r.user.telegramId > 0n ? r.user.username : null;
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          "rounded-2xl border p-4",
                          r.status === "ACCEPTED" ? "border-success/40 bg-success/5" : "border-border",
                          r.status === "DECLINED" && "opacity-60",
                        )}
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <Link href={profileHref(r.user)} className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar user={r.user} size={40} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate font-semibold hover:text-accent">{displayName(r.user)}</span>
                                <ScorePill score={r.user.score} title={d.jobs.devScore} />
                              </span>
                              {r.user.bio && <span className="block truncate text-xs text-muted">{r.user.bio}</span>}
                            </span>
                          </Link>
                          <div className="text-right text-sm">
                            {r.price ? <div className="font-bold tabular-nums">{formatPrice(r.price, locale)}</div> : null}
                            {r.days ? <div className="text-xs text-muted">{fill(d.jobs.days, { n: r.days })}</div> : null}
                          </div>
                        </div>

                        {r.startup && (
                          <Link href={`/startup/${r.startup.slug}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1 text-xs hover:text-accent">
                            <StartupLogo name={r.startup.name} logoUrl={r.startup.logoUrl} size={20} />
                            {d.jobs.viaProject} <b>{r.startup.name}</b>
                          </Link>
                        )}
                        <p className="mt-3 whitespace-pre-line text-sm">{r.message}</p>
                        {r.user.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.user.skills.slice(0, 6).map((s) => (
                              <span key={s} className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">{s}</span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                          <span className="text-xs text-muted">
                            {d.jobs.rstatus[r.status]} · {formatRelative(r.createdAt, locale)}
                          </span>
                          {r.status === "PENDING" && (job.status === "OPEN" || job.status === "IN_PROGRESS") && (
                            <div className="flex gap-2">
                              <form action={decideJobResponse.bind(null, r.id, false)}>
                                <SubmitButton variant="secondary" className="btn-sm">{d.jobs.decline}</SubmitButton>
                              </form>
                              <form action={decideJobResponse.bind(null, r.id, true)}>
                                <SubmitButton className="btn-sm">{d.jobs.accept}</SubmitButton>
                              </form>
                            </div>
                          )}
                          {r.status === "ACCEPTED" && (
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="text-xs font-semibold text-success">{d.jobs.devContacts}:</span>
                              {tg && (
                                <a href={`https://t.me/${tg}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                                  <TelegramIcon className="h-4 w-4" /> @{tg}
                                </a>
                              )}
                              {r.user.githubLogin && (
                                <a href={`https://github.com/${r.user.githubLogin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                                  <GithubIcon className="h-4 w-4" /> {r.user.githubLogin}
                                </a>
                              )}
                              {r.user.contactUrl && <ContactLine value={r.user.contactUrl} />}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* ---------- Правая колонка ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card flex items-center gap-3 p-4">
            <Avatar user={job.author} size={40} />
            <div className="min-w-0">
              <div className="text-xs text-muted">{d.jobs.customer}</div>
              <div className="truncate font-semibold">{company ?? displayName(job.author)}</div>
            </div>
          </div>

          {canManage ? (
            <div className="card space-y-3 p-5">
              <h2 className="font-bold">{d.jobs.manage}</h2>
              {isAuthor && <p className="text-sm text-muted">{d.jobs.ownNote}</p>}
              <div className="flex flex-col gap-2">
                {job.status !== "DONE" && job.status !== "CLOSED" && job.responses.some((r) => r.status === "ACCEPTED") && (
                  <form action={setJobStatus.bind(null, job.id, "DONE")}>
                    <SubmitButton className="w-full">{d.jobs.markDone}</SubmitButton>
                  </form>
                )}
                {job.status !== "CLOSED" && job.status !== "DONE" ? (
                  <form action={setJobStatus.bind(null, job.id, "CLOSED")}>
                    <SubmitButton variant="secondary" className="w-full">{d.jobs.close}</SubmitButton>
                  </form>
                ) : (
                  <form action={setJobStatus.bind(null, job.id, "OPEN")}>
                    <SubmitButton variant="secondary" className="w-full">{d.jobs.reopen}</SubmitButton>
                  </form>
                )}
                {isAdmin && (
                  <form action={toggleJobHidden.bind(null, job.id)}>
                    <SubmitButton variant="secondary" className="w-full text-danger">{job.hidden ? d.jobs.unhide : d.jobs.hide}</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ) : mine ? (
            <div className="card space-y-3 p-5">
              <h2 className="font-bold">{d.jobs.rYours}</h2>
              <p className="whitespace-pre-line text-sm text-muted">{mine.message}</p>
              <div className="flex items-center justify-between text-sm">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    mine.status === "ACCEPTED" ? "bg-success/15 text-success" : mine.status === "DECLINED" ? "bg-fg/5 text-muted" : "bg-accent/10 text-accent",
                  )}
                >
                  {d.jobs.rstatus[mine.status]}
                </span>
                {mine.status === "PENDING" && (
                  <form action={withdrawJobResponse.bind(null, mine.id)}>
                    <SubmitButton variant="secondary" className="btn-sm">{d.jobs.rWithdraw}</SubmitButton>
                  </form>
                )}
              </div>
              {mine.status === "ACCEPTED" && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
                  <div className="font-bold">{d.jobs.contactTitle}</div>
                  <p className="mt-1 text-xs text-muted">{d.jobs.contactHint}</p>
                  <div className="mt-3 space-y-1.5">
                    {job.contact && <div><ContactLine value={job.contact} /></div>}
                    {authorTg && (
                      <a href={`https://t.me/${authorTg}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        <TelegramIcon className="h-4 w-4" /> @{authorTg}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : job.status === "OPEN" ? (
            <div className="card p-5">
              <h2 className="font-bold">{d.jobs.respondTitle}</h2>
              <p className="mb-4 mt-1 text-sm text-muted">{d.jobs.respondText}</p>
              {user ? (
                <JobRespondForm jobId={job.id} myStartups={myStartups} />
              ) : (
                <Link href={`/login?next=${encodeURIComponent(selfHref)}`} className="btn-primary w-full py-2.5">{d.jobs.rLogin}</Link>
              )}
            </div>
          ) : (
            <div className="card p-5 text-center text-sm text-muted">{d.jobs.rClosed}</div>
          )}
        </aside>
      </div>
    </div>
  );
}
