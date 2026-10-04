import Link from "next/link";
import type { StartupCardData } from "@/lib/queries";
import { getI18n } from "@/i18n/server";
import { fill, formatMoneyShort, formatNumber } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { StartupLogo } from "./StartupLogo";
import { VoteButton } from "./VoteButton";
import { scoreColor } from "./ScoreBadge";
import { VerifiedIcon } from "./Badges";
import { HandshakeIcon, PlugIcon, StarIcon } from "./icons";

/** Строка каталога в стиле Product Hunt: место, логотип, название + слоган, мета, голос. */
export function StartupRow({
  startup,
  voted = false,
  rank,
  weekVotes = 0,
}: {
  startup: StartupCardData;
  voted?: boolean;
  rank?: number;
  weekVotes?: number;
}) {
  const { d, locale } = getI18n();
  const href = `/startup/${startup.slug}`;
  const claimed = startup._count.members > 0;
  const hasApi = startup.apiStatus === "PUBLIC" || startup.apiStatus === "BETA";
  const seeking = (startup.fundingNeed ?? 0) > 0;
  const accent = startup.pageAccent && /^#[0-9a-fA-F]{6}$/.test(startup.pageAccent) ? startup.pageAccent : undefined;

  return (
    <article className="group relative flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-surface-2/70 sm:gap-4 sm:p-4">
      <Link href={href} className="absolute inset-0 z-0 rounded-2xl" aria-label={startup.name} />

      {rank !== undefined && (
        <span
          className={
            "hidden w-7 shrink-0 text-center text-sm font-bold tabular-nums sm:block " +
            (rank <= 3 ? "text-fg" : "text-muted/70")
          }
        >
          {rank}
        </span>
      )}

      <div className="relative shrink-0">
        <StartupLogo
          name={startup.name}
          logoUrl={startup.logoUrl}
          size={60}
          className="transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105"
        />
        {accent && <span aria-hidden className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full" style={{ background: accent }} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-[15px] font-bold leading-tight group-hover:text-accent sm:text-base">{startup.name}</h3>
          {claimed && <VerifiedIcon title={d.card.claimedTeam} />}
          {weekVotes > 0 && (
            <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-bold text-accent">
              +{weekVotes} {d.row.thisWeek}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{startup.shortDesc}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span
            className="inline-flex items-center gap-1 font-bold tabular-nums"
            style={{ color: `rgb(${scoreColor(startup.score)})` }}
            title={d.card.score}
          >
            ★ {startup.score}
          </span>
          {startup.tags.slice(0, 2).map((t) => (
            <span key={t.id} className="inline-flex items-center gap-2">
              <span aria-hidden className="text-border">•</span>
              <Link
                href={`/?tag=${encodeURIComponent(t.name)}`}
                className="relative z-10 hover:text-fg hover:underline"
              >
                {tTag(d, t.name)}
              </Link>
            </span>
          ))}
          {hasApi && (
            <span className="inline-flex items-center gap-1 text-success" title={d.api.status[startup.apiStatus]}>
              <span aria-hidden className="text-border">•</span>
              <PlugIcon className="h-3.5 w-3.5" /> API
            </span>
          )}
          {startup.openToCollab && (
            <span className="hidden items-center gap-1 text-violet-500 sm:inline-flex" title={d.card.collab}>
              <span aria-hidden className="text-border">•</span>
              <HandshakeIcon className="h-3.5 w-3.5" /> {d.row.collab}
            </span>
          )}
          <Link href={`${href}/invest`} className={"relative z-10 inline-flex items-center gap-1 font-semibold sm:hidden " + (seeking ? "text-success" : "text-fg")}>
            <span aria-hidden className="text-border">•</span>
            {d.invest.cta} →
          </Link>
          {startup.githubStars > 0 && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <span aria-hidden className="text-border">•</span>
              <StarIcon className="h-3.5 w-3.5" /> {formatNumber(startup.githubStars, locale)}
            </span>
          )}
        </div>
      </div>

      <Link
        href={`${href}/invest`}
        className="relative z-10 hidden shrink-0 flex-col items-end gap-1 text-right leading-tight sm:flex"
      >
        <span className={seeking ? "text-[11px] font-semibold text-success" : "text-[11px] text-muted"}>
          {seeking ? fill(d.invest.seeking, { amount: formatMoneyShort(startup.fundingNeed ?? 0, locale) }) : d.invest.notSeeking}
        </span>
        <span
          className={
            "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors " +
            (seeking
              ? "border-success/40 bg-success/10 text-success hover:bg-success hover:text-white"
              : "border-border text-fg hover:border-fg/40")
          }
        >
          {d.invest.cta}
        </span>
      </Link>

      <VoteButton startupId={startup.id} count={startup.votesCount} voted={voted} />
    </article>
  );
}
