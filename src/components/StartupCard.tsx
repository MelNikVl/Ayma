import Link from "next/link";
import type { StartupCardData } from "@/lib/queries";
import { getI18n } from "@/i18n/server";
import { fill, formatMoneyShort } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { StartupLogo } from "./StartupLogo";
import { TagBadge } from "./TagBadge";
import { GithubBadge } from "./GithubBadge";
import { VoteButton } from "./VoteButton";
import { ScorePill } from "./ScoreBadge";
import { ApiBadge, CollabBadge, VerifiedIcon } from "./Badges";

export function StartupCard({
  startup,
  voted = false,
  rank,
}: {
  startup: StartupCardData;
  voted?: boolean;
  rank?: number;
}) {
  const { d, locale } = getI18n();
  const href = `/startup/${startup.slug}`;
  const seeking = (startup.fundingNeed ?? 0) > 0;
  const claimed = startup._count.members > 0;
  const accent = startup.pageAccent && /^#[0-9a-fA-F]{6}$/.test(startup.pageAccent) ? startup.pageAccent : null;

  return (
    <article className="card group relative flex h-full flex-col overflow-hidden p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover sm:p-5">
      {accent && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />}
      <Link href={href} className="absolute inset-0 z-0" aria-label={startup.name} />

      <div className="flex items-start gap-3">
        <div className="relative">
          <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={52} />
          {rank !== undefined && rank <= 3 && (
            <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-fg text-[11px] font-bold text-bg ring-2 ring-surface">
              {rank}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-base font-bold leading-tight group-hover:text-accent">{startup.name}</h3>
            {claimed && <VerifiedIcon title={d.card.claimedTeam} />}
            {startup.isDemo && <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-bold text-warning">{d.pp.demoBadge}</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{startup.shortDesc}</p>
        </div>
        <VoteButton startupId={startup.id} count={startup.votesCount} voted={voted} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <ScorePill score={startup.score} title={d.card.score} />
        <ApiBadge status={startup.apiStatus} label={d.api.status[startup.apiStatus]} />
        {startup.openToCollab && <CollabBadge label={d.card.collab} />}
        {startup.tags.slice(0, 3).map((t) => (
          <TagBadge key={t.id} name={tTag(d, t.name)} color={t.color} />
        ))}
      </div>

      <div className="mt-auto pt-4">
        {startup.githubUrl && (
          <div className="mb-3">
            <GithubBadge stars={startup.githubStars} lastCommit={startup.githubLastCommit} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          {seeking ? (
            <span className="text-sm font-bold text-success">
              {fill(d.invest.seeking, { amount: formatMoneyShort(startup.fundingNeed ?? 0, locale) })}
            </span>
          ) : (
            <span className="text-xs text-muted">{startup._count.comments > 0 ? `💬 ${startup._count.comments}` : ""}</span>
          )}
          <Link href={href} className="btn-secondary btn-sm relative z-10">{d.card.more}</Link>
        </div>
      </div>
    </article>
  );
}
