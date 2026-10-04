import Link from "next/link";
import { CROWD_SORTS, listCrowd, type CrowdSort } from "@/lib/crowd";
import { getI18n } from "@/i18n/server";
import { fill, formatMoneyShort, formatNumber, plural } from "@/i18n/format";
import { StartupLogo } from "@/components/StartupLogo";
import { ScorePill } from "@/components/ScoreBadge";
import { tTag } from "@/i18n/dictionaries";
import { ClockIcon, CoinsIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const { d } = getI18n();
  return { title: d.crowd.title, description: d.crowd.text };
}

export default async function CrowdfundingPage({ searchParams }: { searchParams: { sort?: string } }) {
  const { d, locale } = getI18n();
  const sort: CrowdSort = CROWD_SORTS.includes(searchParams.sort as CrowdSort) ? (searchParams.sort as CrowdSort) : "new";
  const { items, total, interestTotal } = await listCrowd(sort);
  const sortLabel: Record<CrowdSort, string> = {
    new: d.crowd.sortNew,
    big: d.crowd.sortAmountDesc,
    small: d.crowd.sortAmountAsc,
    popular: d.crowd.sortInterest,
  };

  return (
    <div>
      <section className="border-b border-border/60 bg-gradient-to-b from-success/[0.08] to-transparent">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{d.crowd.title}</h1>
            <p className="mt-3 max-w-2xl text-muted sm:text-lg">{d.crowd.text}</p>
            <dl className="mt-7 grid max-w-lg grid-cols-3 gap-4">
              {[
                [formatNumber(items.length, locale), d.crowd.statProjects],
                [formatMoneyShort(total, locale), d.crowd.statTotal],
                [formatMoneyShort(interestTotal, locale), d.crowd.statInterest],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-extrabold tabular-nums">{v}</dt>
                  <dd className="text-xs text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card self-center p-5">
            <div className="font-bold">{d.crowd.cta}</div>
            <p className="mt-1 text-sm text-muted">{d.crowd.ctaText}</p>
            <Link href="/crowdfunding/start" className="btn-primary mt-4 w-full">
              <PlusIcon className="h-4 w-4" /> {d.crowd.cta}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-0.5 text-sm font-semibold sm:inline-flex">
          {CROWD_SORTS.map((s) => (
            <Link
              key={s}
              href={s === "new" ? "/crowdfunding" : `/crowdfunding?sort=${s}`}
              aria-pressed={sort === s}
              className={cn("rounded-lg px-3 py-1.5", sort === s ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              {sortLabel[s]}
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="card px-6 py-16 text-center text-muted">{d.crowd.empty}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => {
              const need = p.fundingNeed ?? 0;
              const pct = need ? Math.min(100, Math.round((p.interested / need) * 100)) : 0;
              const accent = p.pageAccent && /^#[0-9a-fA-F]{6}$/.test(p.pageAccent) ? p.pageAccent : "#16A34A";
              return (
                <article key={p.id} className="card group relative flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-card-hover">
                  <Link href={`/startup/${p.slug}`} className="absolute inset-0 z-0" aria-label={p.name} />
                  <div className="h-1.5" style={{ background: accent }} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start gap-3">
                      <StartupLogo name={p.name} logoUrl={p.logoUrl} size={48} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h2 className="truncate text-lg font-bold group-hover:text-accent">{p.name}</h2>
                          {p.isDemo && <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-bold text-warning">{d.pp.demoBadge}</span>}
                        </div>
                        <p className="line-clamp-2 text-sm text-muted">{p.shortDesc}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{d.crowd.goal}</div>
                        <div className="text-2xl font-extrabold tabular-nums">{formatMoneyShort(need, locale)}</div>
                      </div>
                      <ScorePill score={p.score} title={d.card.score} />
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(pct, p.interested ? 3 : 0)}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-muted">
                      <span>
                        {formatMoneyShort(p.interested, locale)} {d.crowd.interested}
                        {p.investors > 0 && ` · ${p.investors} ${plural(p.investors, d.invest.investorsForms, locale)}`}
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>

                    {p.breakdown.length > 0 && (
                      <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm">
                        {p.breakdown.slice(0, 4).map((b) => (
                          <li key={b.item} className="flex justify-between gap-3">
                            <span className="min-w-0 truncate text-muted">{b.item}</span>
                            <span className="shrink-0 font-semibold tabular-nums">{formatMoneyShort(b.amount, locale)}</span>
                          </li>
                        ))}
                        {p.breakdown.length > 4 && <li className="text-xs text-muted">+{p.breakdown.length - 4}</li>}
                      </ul>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-muted">
                      {p.buildMonths !== null && (
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {p.buildMonths === 0 ? d.pp.ready : fill(d.pp.buildValue, { n: p.buildMonths })}
                        </span>
                      )}
                      {p.tags.map((t) => (
                        <span key={t.name} className="rounded bg-surface-2 px-1.5 py-0.5">{tTag(d, t.name)}</span>
                      ))}
                    </div>
                    <div className="relative z-10 mt-4 flex gap-2">
                      <Link href={`/startup/${p.slug}/invest`} className="btn-primary flex-1">
                        <CoinsIcon className="h-4 w-4" /> {d.crowd.investCta}
                      </Link>
                      <Link href={`/startup/${p.slug}#invest`} className="btn-secondary">{d.crowd.details}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-xs text-muted">{d.invest.disclaimer}</p>
      </div>
    </div>
  );
}
