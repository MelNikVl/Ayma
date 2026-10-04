import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFundingStats, weeklyVotes } from "@/lib/queries";
import { fetchRecentCommits, fetchRepoInfo, parseGithubUrl } from "@/lib/github";
import { displayName } from "@/lib/format";
import { MAX_MEMBERS } from "@/lib/access";
import { parseRepoMeta } from "@/lib/repo-meta";
import { STARTUP_SCORE_MAX, type StartupScoreParts } from "@/lib/score";
import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";
import { fill, formatCompact, formatDate, formatPrice, formatRelative, plural } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { claimStartup } from "@/app/actions/team";
import { StartupLogo } from "@/components/StartupLogo";
import { TagBadge } from "@/components/TagBadge";
import { Markdown } from "@/components/Markdown";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar } from "@/components/Avatar";
import { VoteButton } from "@/components/VoteButton";
import { CryptoSponsor } from "@/components/CryptoSponsor";
import { DevLinks } from "@/components/DevLinks";
import { chainById, formatUsdt, shortAddress } from "@/lib/crypto";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { Roadmap, parseRoadmap } from "@/components/Roadmap";
import { RepoDetails, Stat } from "@/components/RepoDetails";
import { ClaimForm } from "@/components/ClaimForm";
import { CollabForm } from "@/components/CollabForm";
import { CopyField } from "@/components/CopyField";
import { ApiBadge, CollabBadge, FundingBadge, VerifiedIcon } from "@/components/Badges";
import { profileHref } from "@/components/UserMenu";
import {
  ClockIcon,
  CoinsIcon,
  ExternalIcon,
  EyeIcon,
  GithubIcon,
  HandshakeIcon,
  HeartIcon,
  PlugIcon,
  RocketIcon,
  TrophyIcon,
} from "@/components/icons";
import { getStartupBySlug } from "./data";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string }; searchParams: { created?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStartupBySlug(params.slug);
  if (!s || s.status !== "APPROVED") return { title: "AYMA" };
  return {
    title: s.name,
    description: s.shortDesc,
    openGraph: { title: s.name, description: s.shortDesc },
    twitter: { card: "summary_large_image", title: s.name, description: s.shortDesc },
  };
}

async function cryptoStats(startupId: string) {
  const [agg, recent] = await Promise.all([
    prisma.cryptoDonation.aggregate({ where: { startupId, status: "CONFIRMED" }, _sum: { amountCents: true }, _count: true }),
    prisma.cryptoDonation.findMany({
      where: { startupId, status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, chainId: true, txHash: true, fromAddress: true, amountCents: true, message: true, user: { select: { githubLogin: true } } },
    }),
  ]);
  return { totalCents: agg._sum.amountCents ?? 0, count: agg._count, recent };
}

function hexToRgb(hex: string | null): string | null {
  const m = hex ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) : null;
  return m ? `${parseInt(m[1]!, 16)} ${parseInt(m[2]!, 16)} ${parseInt(m[3]!, 16)}` : null;
}

export default async function StartupPage({ params, searchParams }: Props) {
  const { d, locale } = getI18n();
  const [startup, user] = await Promise.all([getStartupBySlug(params.slug), getCurrentUser()]);
  if (!startup) notFound();

  const isMember = Boolean(user && startup.members.some((m) => m.userId === user.id));
  const isAdmin = user?.role === "ADMIN";
  const canManage = isMember || isAdmin;
  const claimed = startup.members.length > 0;
  if (startup.status !== "APPROVED" && !canManage) notFound();

  if (startup.status === "APPROVED" && !isMember) {
    await prisma.startup.update({ where: { id: startup.id }, data: { viewsCount: { increment: 1 } } });
  }

  const meta = parseRepoMeta(startup.repoMeta);
  const repo = parseGithubUrl(startup.githubUrl);
  const roadmap = parseRoadmap(startup.roadmap);
  const [funding, repoInfo, commits, voted, week, pendingClaim, myStartups, crypto] = await Promise.all([
    getFundingStats(startup.id),
    repo ? fetchRepoInfo(repo) : Promise.resolve(null),
    repo && !meta?.commits?.length ? fetchRecentCommits(repo, 5) : Promise.resolve([]),
    user
      ? prisma.vote.findUnique({ where: { userId_startupId: { userId: user.id, startupId: startup.id } } }).then(Boolean)
      : Promise.resolve(false),
    weeklyVotes([startup.id]),
    user && !isMember
      ? prisma.claimRequest.findUnique({
          where: { startupId_userId: { startupId: startup.id, userId: user.id } },
          select: { status: true },
        })
      : Promise.resolve(null),
    user
      ? prisma.startup.findMany({
          where: { members: { some: { userId: user.id } }, id: { not: startup.id } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    cryptoStats(startup.id),
  ]);

  const stars = repoInfo?.stars ?? startup.githubStars;
  const lastPush = repoInfo?.pushedAt ?? startup.githubLastCommit;
  const canPreorder = startup.preOrderEnabled && startup.preOrderPrice > 0 && startup.status === "APPROVED";
  const sponsorHref = `/startup/${startup.slug}/sponsor`;
  const loginHref = `/login?next=${encodeURIComponent(`/startup/${startup.slug}`)}`;
  const accentRgb = hexToRgb(startup.pageAccent);
  const layout = startup.pageLayout;
  const scoreParts = (startup.scoreData ?? {}) as Partial<StartupScoreParts>;
  const weekVotes = week.get(startup.id) ?? 0;
  const badgeUrl = `${env.appUrl}/api/badge/${startup.slug}`;
  const pageUrl = `${env.appUrl}/startup/${startup.slug}`;

  const tags = startup.tags.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {startup.tags.map((t) => (
        <TagBadge key={t.id} name={tTag(d, t.name)} color={t.color} size="md" href={`/?tag=${encodeURIComponent(t.name)}`} />
      ))}
    </div>
  );

  const badges = (
    <div className="flex flex-wrap gap-1.5">
      <ApiBadge status={startup.apiStatus} label={d.api.status[startup.apiStatus]} />
      {startup.openToCollab && <CollabBadge label={d.collab.open} />}
      {startup.fundingNeed ? <FundingBadge label={d.startup.funding} /> : null}
      {meta?.maturity && (
        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
          <RocketIcon className="h-3 w-3" /> {d.startup.maturity[meta.maturity] ?? meta.maturity}
        </span>
      )}
    </div>
  );

  const links = (
    <div className={cn("flex flex-wrap gap-2", layout === "minimal" && "justify-center")}>
      {startup.demoUrl && <ExtLink href={startup.demoUrl} primary>{d.startup.demo}</ExtLink>}
      {startup.websiteUrl && <ExtLink href={startup.websiteUrl}>{d.startup.website}</ExtLink>}
      {startup.githubUrl && (
        <ExtLink href={startup.githubUrl}>
          <GithubIcon className="h-4 w-4" /> GitHub
        </ExtLink>
      )}
      {canManage && (
        <Link href={`/startup/${startup.slug}/edit`} className="btn-secondary btn-sm">{d.common.edit}</Link>
      )}
    </div>
  );

  const metaLine = (
    <div className={cn("flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted", layout === "minimal" && "justify-center")}>
      {claimed ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {startup.members.map((m) => (
              <Avatar key={m.id} user={m.user} size={20} className="ring-2 ring-surface" />
            ))}
          </span>
          {startup.members.map((m) => displayName(m.user)).join(", ")}
        </span>
      ) : meta?.team ? (
        <span>{fill(d.startup.team, { name: meta.team })}</span>
      ) : null}
      <span className="inline-flex items-center gap-1.5"><EyeIcon className="h-4 w-4" /> {formatCompact(startup.viewsCount)}</span>
      <span className="inline-flex items-center gap-1.5">
        <HeartIcon className="h-4 w-4" /> {funding.sponsors.length} {plural(funding.sponsors.length, d.common.sponsors, locale)}
      </span>
      {weekVotes > 0 && (
        <span className="inline-flex items-center gap-1.5 text-warning">
          <TrophyIcon className="h-4 w-4" /> {fill(d.rating.votesWeek, { n: weekVotes })}
        </span>
      )}
      <span>{fill(d.startup.since, { date: formatDate(startup.createdAt, locale) })}</span>
    </div>
  );

  const title = (
    <h1 className={cn("p-head flex items-center gap-2 font-extrabold tracking-tight", layout === "wide" ? "text-3xl sm:text-5xl" : "text-2xl sm:text-4xl", layout === "minimal" && "justify-center")}>
      {startup.name}
      {claimed && <VerifiedIcon title={d.card.claimedTeam} />}
    </h1>
  );

  /* ---------- Шапка в зависимости от макета ---------- */
  const header =
    layout === "wide" ? (
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: startup.coverUrl
              ? `url(${startup.coverUrl})`
              : `linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent) / 0.4))`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 sm:pt-36">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={112} className="ring-4 ring-surface" />
            <div className="min-w-0 flex-1 space-y-3">
              {title}
              <p className="max-w-3xl text-base text-muted sm:text-lg">{startup.shortDesc}</p>
              {badges}
              {tags}
            </div>
            <VoteButton startupId={startup.id} count={startup.votesCount} voted={voted} size="lg" />
          </div>
          <div className="mt-5 space-y-4">
            {links}
            {metaLine}
          </div>
        </div>
      </section>
    ) : layout === "minimal" ? (
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-12 text-center sm:px-6">
        <div className="flex justify-center">
          <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={96} />
        </div>
        <div className="mt-5">{title}</div>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted sm:text-lg">{startup.shortDesc}</p>
        <div className="mt-4 flex justify-center">{badges}</div>
        <div className="mt-3 flex justify-center">{tags}</div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <VoteButton startupId={startup.id} count={startup.votesCount} voted={voted} size="lg" />
        </div>
        <div className="mt-5 space-y-4">
          {links}
          {metaLine}
        </div>
      </section>
    ) : (
      <>
        {startup.coverUrl && (
          <div className="h-40 w-full overflow-hidden bg-surface-2 sm:h-56 lg:h-64">
            <img src={startup.coverUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <section className="card p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={96} />
              <div className="min-w-0 flex-1 space-y-3">
                {title}
                <p className="text-[15px] text-muted">{startup.shortDesc}</p>
                {badges}
                {tags}
                {links}
              </div>
              <VoteButton startupId={startup.id} count={startup.votesCount} voted={voted} size="lg" />
            </div>
            <div className="mt-5 border-t border-border/60 pt-4">{metaLine}</div>
          </section>
        </div>
      </>
    );

  /* ---------- Левая колонка ---------- */
  const main = (
    <div className="min-w-0 space-y-6">
      <section className="card p-5 sm:p-7">
        <h2 className="p-head mb-4 text-lg font-bold">{d.startup.about}</h2>
        <Markdown>{startup.fullDesc}</Markdown>
      </section>

      {roadmap.length > 0 && (
        <section className="card p-5 sm:p-7">
          <h2 className="p-head mb-5 text-lg font-bold">{d.startup.roadmap}</h2>
          <Roadmap items={roadmap} />
        </section>
      )}

      {(startup.advantages || startup.competitors) && (
        <section className="card p-5 sm:p-7">
          <h2 className="p-head mb-4 text-lg font-bold">{d.startup.advantages}</h2>
          {startup.advantages && <Markdown>{startup.advantages}</Markdown>}
          {startup.competitors && (
            <p className="mt-4 text-sm text-muted">
              <b className="text-fg">{d.startup.competitors}:</b> {startup.competitors}
            </p>
          )}
        </section>
      )}

      {startup.readme && (
        <section className="card p-5 sm:p-7" id="readme">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="p-head text-lg font-bold">{d.startup.readme}</h2>
            {repo && (
              <a
                href={`https://github.com/${repo.owner}/${repo.repo}/blob/HEAD/${meta?.readmePath ?? "README.md"}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {meta?.readmePath ?? "README.md"}
              </a>
            )}
          </div>
          <div className="max-h-[900px] overflow-y-auto pr-1">
            <Markdown
              repo={repo ? { ...repo, dir: meta?.readmePath?.includes("/") ? meta.readmePath.replace(/\/[^/]*$/, "") : undefined } : undefined}
            >
              {startup.readme}
            </Markdown>
          </div>
        </section>
      )}

      {repo && (
        <section className="card p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="p-head flex items-center gap-2 text-lg font-bold">
              <GithubIcon className="h-5 w-5" /> {d.startup.github}
            </h2>
            <a href={startup.githubUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
              {repo.owner}/{repo.repo}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={d.startup.stars} value={`⭐ ${formatCompact(stars)}`} />
            <Stat label={d.startup.forks} value={repoInfo ? formatCompact(repoInfo.forks) : "—"} />
            <Stat label={d.startup.language} value={repoInfo?.language ?? "—"} />
            <Stat label={d.startup.lastPush} value={lastPush ? formatRelative(lastPush, locale) : "—"} />
          </div>
          {commits.length > 0 && (
            <ul className="mt-5 divide-y divide-border/60 rounded-lg border border-border/60">
              {commits.map((c) => (
                <li key={c.sha} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <a href={c.url} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs text-accent hover:underline">{c.sha}</a>
                  <span className="min-w-0 flex-1 truncate">{c.message}</span>
                  <span className="hidden shrink-0 text-xs text-muted sm:inline">{c.author} · {formatRelative(c.date, locale)}</span>
                </li>
              ))}
            </ul>
          )}
          {meta && <RepoDetails meta={meta} repoUrl={`https://github.com/${repo.owner}/${repo.repo}`} />}
          {!repoInfo && !meta && <p className="mt-4 text-sm text-muted">{d.startup.githubFailed}</p>}
        </section>
      )}

      <section className="card p-5 sm:p-7" id="sponsors">
        <h2 className="p-head mb-4 text-lg font-bold">
          {d.startup.sponsors} <span className="font-normal text-muted">{funding.sponsors.length}</span>
        </h2>
        {funding.sponsors.length === 0 ? (
          <p className="text-sm text-muted">{d.startup.noSponsors}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {funding.sponsors.map((s) => (
              <li key={s.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                <Avatar user={s} size={28} />
                <span className="truncate text-sm">{displayName(s)}</span>
              </li>
            ))}
          </ul>
        )}
        {crypto.recent.length > 0 && (
          <div className="mt-6 border-t border-border/60 pt-5">
            <h3 className="mb-3 flex items-baseline gap-2 text-sm font-bold">
              {d.crypto.sponsorsTitle}
              <span className="font-normal text-muted">
                {formatUsdt(crypto.totalCents)} · {crypto.count} {d.crypto.donors}
              </span>
            </h3>
            <ul className="divide-y divide-border/50">
              {crypto.recent.map((c) => {
                const ch = chainById(c.chainId);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">
                        {c.user?.githubLogin ? `@${c.user.githubLogin}` : `${d.crypto.anon} ${shortAddress(c.fromAddress ?? "")}`}
                      </span>
                      {c.message && <span className="ml-2 text-muted">«{c.message}»</span>}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">{formatUsdt(c.amountCents)}</span>
                    {ch && (
                      <a
                        href={`${ch.explorer}/tx/${c.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted hover:text-fg"
                      >
                        {ch.short} ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );

  /* ---------- Правая колонка ---------- */
  const asideCards = (
    <>
      <div className="card p-5 sm:p-6">
        {canPreorder ? (
          <>
            <div className="text-xs uppercase tracking-wide text-muted">{d.startup.preorderFrom}</div>
            <div className="mt-1 text-3xl font-extrabold tabular-nums">{formatPrice(startup.preOrderPrice, locale)}</div>
            {startup.preOrderDesc && <p className="mt-3 whitespace-pre-line text-sm text-muted">{startup.preOrderDesc}</p>}
            {startup.preOrderGoal > 0 && (
              <div className="mt-5"><ProgressBar raised={funding.raised} goal={startup.preOrderGoal} /></div>
            )}
            {!isMember ? (
              <Link href={sponsorHref} className="btn-primary mt-5 w-full py-3 text-base">{d.card.sponsor}</Link>
            ) : (
              <Link href="/dashboard" className="btn-secondary mt-5 w-full">{d.startup.toDashboard}</Link>
            )}
            {!claimed && <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs">{d.startup.unclaimedNote}</p>}
            <p className="mt-3 text-center text-xs text-muted">
              {d.startup.notInvestment} <Link href="/terms" className="underline">{d.startup.terms}</Link>
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="text-sm font-semibold">{d.startup.preorderClosed}</div>
            <p className="mt-1 text-sm text-muted">{d.startup.preorderClosedText}</p>
          </div>
        )}
        {funding.sponsors.length > 0 && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="mb-2 text-xs font-medium text-muted">{d.startup.alreadySupported}</div>
            <div className="flex -space-x-2">
              {funding.sponsors.slice(0, 10).map((s) => (
                <Avatar key={s.id} user={s} size={32} className="ring-2 ring-surface" />
              ))}
            </div>
          </div>
        )}
      </div>

      {startup.walletAddress && startup.status === "APPROVED" ? (
        <div className="card p-5 sm:p-6" id="usdt">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="p-head text-base font-bold">{d.crypto.title}</h2>
              <p className="mt-0.5 text-xs text-muted">{d.crypto.subtitle}</p>
            </div>
            {crypto.totalCents > 0 && (
              <div className="shrink-0 text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted">{d.crypto.total}</div>
                <div className="text-lg font-extrabold tabular-nums">{formatUsdt(crypto.totalCents)}</div>
              </div>
            )}
          </div>
          <details className="group mt-4">
            <summary className="btn-secondary w-full cursor-pointer list-none py-2.5 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{d.crypto.title}</span>
              <span className="hidden text-sm text-muted group-open:inline">{d.common.close}</span>
            </summary>
            <div className="mt-4">
              <CryptoSponsor startupId={startup.id} wallet={startup.walletAddress} />
            </div>
          </details>
        </div>
      ) : canManage ? (
        <div className="card border-dashed p-5 text-sm sm:p-6">
          <p className="text-muted">{d.crypto.noWalletTeam}</p>
          <Link href={`/startup/${startup.slug}/edit?tab=business#walletAddress`} className="mt-3 inline-block font-semibold text-accent hover:underline">
            {d.crypto.addWallet} →
          </Link>
        </div>
      ) : null}

      <div className="card p-5 sm:p-6">
        <ScoreBreakdown
          score={startup.score}
          parts={(Object.keys(STARTUP_SCORE_MAX) as (keyof StartupScoreParts)[]).map((k) => ({
            key: k,
            label: d.score.parts[k],
            hint: d.score.hints[k],
            value: scoreParts[k] ?? 0,
            max: STARTUP_SCORE_MAX[k],
          }))}
        />
        <Link href="/rating#how" className="mt-4 block text-xs text-accent hover:underline">{d.score.howTitle} →</Link>
      </div>

      {(startup.implPrice || startup.implDays || startup.fundingNeed) && (
        <div className="card space-y-4 p-5 sm:p-6">
          {(startup.implPrice || startup.implDays) && (
            <div>
              <h3 className="p-head mb-3 flex items-center gap-2 font-bold"><ClockIcon className="h-4 w-4" /> {d.startup.implementation}</h3>
              <div className="grid grid-cols-2 gap-3">
                {startup.implPrice ? <Stat label={d.startup.implPrice} value={formatPrice(startup.implPrice, locale)} /> : null}
                {startup.implDays ? (
                  <Stat label={d.startup.implDays} value={fill(d.startup.implDaysValue, { n: startup.implDays, days: plural(startup.implDays, d.common.days, locale) })} />
                ) : null}
              </div>
            </div>
          )}
          {startup.fundingNeed ? (
            <div>
              <h3 className="p-head mb-2 flex items-center gap-2 font-bold"><CoinsIcon className="h-4 w-4" /> {d.startup.funding}</h3>
              <div className="text-2xl font-extrabold tabular-nums">{formatPrice(startup.fundingNeed, locale)}</div>
              {startup.fundingNeedDesc && <p className="mt-2 whitespace-pre-line text-sm text-muted">{startup.fundingNeedDesc}</p>}
            </div>
          ) : null}
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <h3 className="p-head mb-3 flex items-center gap-2 font-bold"><PlugIcon className="h-4 w-4" /> {d.api.title}</h3>
        {startup.apiStatus === "NONE" ? (
          <p className="text-sm text-muted">{d.api.none}</p>
        ) : (
          <div className="space-y-3">
            <ApiBadge status={startup.apiStatus} label={d.api.status[startup.apiStatus]} className="text-xs" />
            {startup.apiTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {startup.apiTypes.map((t) => (
                  <span key={t} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">{t}</span>
                ))}
              </div>
            )}
            {startup.apiDocsUrl && (
              <a href={startup.apiDocsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
                {d.api.docs} <ExternalIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="card p-5 sm:p-6" id="team">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="p-head font-bold">{d.startup.teamOnAyma}</h3>
          <span className="text-xs text-muted">{startup.members.length} / {MAX_MEMBERS}</span>
        </div>
        {startup.members.length > 0 ? (
          <ul className="space-y-2">
            {startup.members.map((m) => (
              <li key={m.id} className="flex items-center gap-1">
                <Link href={profileHref(m.user)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-sm hover:bg-surface-2">
                  <Avatar user={m.user} size={30} />
                  <span className="min-w-0 flex-1 truncate">
                    {m.user.firstName ?? displayName(m.user)}
                    {m.user.githubLogin && <span className="ml-1 text-xs text-muted">@{m.user.githubLogin}</span>}
                  </span>
                  {m.role === "OWNER" && <span className="text-[11px] text-muted">{d.startup.owner}</span>}
                </Link>
                <DevLinks linkedinUrl={m.user.linkedinUrl} resumeUrl={m.user.resumeUrl} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{d.startup.nobodyClaimed}</p>
        )}
        {!isMember && startup.members.length < MAX_MEMBERS && (
          <div className="mt-4">
            {!user ? (
              <Link href={loginHref} className="btn-secondary w-full">
                <GithubIcon className="h-4 w-4" /> {d.startup.claimLogin}
              </Link>
            ) : pendingClaim?.status === "PENDING" ? (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{d.startup.claimPending}</p>
            ) : (
              <ClaimForm action={claimStartup.bind(null, startup.id)} hasGithub={Boolean(user.githubLogin)} />
            )}
          </div>
        )}
        {isMember && (
          <Link href="/dashboard" className="mt-3 block text-sm text-accent hover:underline">{d.startup.manageTeam}</Link>
        )}
      </div>

      {(startup.openToCollab || !isMember) && (
        <div className="card p-5 sm:p-6">
          <h3 className="p-head mb-2 flex items-center gap-2 font-bold">
            <HandshakeIcon className="h-4 w-4" /> {startup.openToCollab ? d.collab.open : d.collab.closed}
          </h3>
          {startup.collabNote && (
            <p className="mb-3 whitespace-pre-line text-sm text-muted">
              <b className="text-fg">{d.collab.whatWeLook}:</b> {startup.collabNote}
            </p>
          )}
          {!isMember && (
            <CollabForm
              toStartupId={startup.id}
              targetName={startup.name}
              myStartups={myStartups}
              loggedIn={Boolean(user)}
              loginHref={loginHref}
            />
          )}
        </div>
      )}

      <div className="card space-y-3 p-5 sm:p-6">
        <h3 className="p-head font-bold">{d.startup.badge}</h3>
        <p className="text-xs text-muted">{d.startup.badgeText}</p>
        <img src={`/api/badge/${startup.slug}`} alt="AYMA badge" className="h-7" />
        <CopyField value={`[![AYMA](${badgeUrl})](${pageUrl})`} label="Markdown" />
      </div>
    </>
  );

  return (
    <div
      data-ptheme={startup.pageTheme}
      data-pfont={startup.pageFont}
      style={accentRgb ? ({ "--accent": accentRgb, "--accent-hover": accentRgb } as React.CSSProperties) : undefined}
      className="bg-bg pb-28 text-fg lg:pb-10"
    >
      <StatusBanner status={startup.status} created={searchParams.created === "1"} d={d} />
      {header}

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {layout === "minimal" ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="grid items-start gap-4 sm:grid-cols-2">{asideCards}</div>
            {main}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            {main}
            <aside className="space-y-4">{asideCards}</aside>
          </div>
        )}
      </div>

      {canPreorder && !isMember && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="leading-tight">
              <div className="text-[11px] text-muted">{d.card.preorderFrom}</div>
              <div className="text-lg font-bold tabular-nums">{formatPrice(startup.preOrderPrice, locale)}</div>
            </div>
            <Link href={sponsorHref} className="btn-primary flex-1 py-3 sm:flex-none sm:px-8">{d.card.sponsor}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ status, created, d }: { status: string; created: boolean; d: ReturnType<typeof getI18n>["d"] }) {
  const box = "mx-auto mt-4 max-w-7xl px-4 sm:px-6";
  if (status === "PENDING")
    return (
      <div className={box}>
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          {created ? `🎉 ${d.startup.created} ` : ""}
          {d.startup.pendingBanner}
        </div>
      </div>
    );
  if (status === "REJECTED")
    return (
      <div className={box}>
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{d.startup.rejectedBanner}</div>
      </div>
    );
  if (created)
    return (
      <div className={box}>
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">🎉 {d.startup.published}</div>
      </div>
    );
  return null;
}

function ExtLink({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={primary ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
      {children}
      <ExternalIcon className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}
