import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { investStats } from "@/lib/queries";
import { getI18n } from "@/i18n/server";
import { fill, formatPrice, plural } from "@/i18n/format";
import { withdrawInvestInterest } from "@/app/actions/invest";
import { StartupLogo } from "@/components/StartupLogo";
import { InvestForm } from "@/components/InvestForm";
import { SubmitButton } from "@/components/SubmitButton";
import { getStartupBySlug } from "../data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { d } = getI18n();
  const s = await getStartupBySlug(params.slug);
  return { title: s ? fill(d.invest.pageTitle, { name: s.name }) : d.invest.title };
}

export default async function InvestPage({ params }: { params: { slug: string } }) {
  const { d, locale } = getI18n();
  const startup = await getStartupBySlug(params.slug);
  if (!startup || startup.status !== "APPROVED") notFound();
  const user = await getCurrentUser();
  const selfPath = `/startup/${startup.slug}/invest`;
  const [stats, mine, profile] = await Promise.all([
    investStats(startup.id),
    user ? prisma.investInterest.findUnique({ where: { startupId_userId: { startupId: startup.id, userId: user.id } } }) : null,
    user ? prisma.user.findUnique({ where: { id: user.id }, select: { username: true, telegramId: true } }) : null,
  ]);
  const isOwn = Boolean(user && startup.members.some((m) => m.userId === user.id));
  const need = startup.fundingNeed ?? 0;
  const pct = need > 0 ? Math.min(100, Math.round((stats.interested / need) * 100)) : 0;
  const tg = profile?.username && profile.telegramId && profile.telegramId > 0n ? `@${profile.username}` : "";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        <Link href={`/startup/${startup.slug}`} className="text-sm text-muted hover:text-fg">{d.invest.back}</Link>
        <div className="mt-4 flex items-center gap-3">
          <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={52} />
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{fill(d.invest.pageTitle, { name: startup.name })}</h1>
        </div>
        <p className="mt-3 text-muted">{d.invest.pageText}</p>

        <div className="card mt-6 p-5 sm:p-7">
          {!user ? (
            <div className="py-6 text-center">
              <h2 className="text-lg font-bold">{d.invest.loginTitle}</h2>
              <Link href={`/login?next=${encodeURIComponent(selfPath)}`} className="btn-primary mt-4 px-6 py-3">{d.jobs.login}</Link>
            </div>
          ) : isOwn ? (
            <p className="py-6 text-center text-sm text-muted">{d.invest.own}</p>
          ) : (
            <>
              {mine && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  <span>
                    {fill(d.invest.yours, { amount: formatPrice(mine.amount, locale) })} ·{" "}
                    <b>{d.invest.status[mine.status]}</b>
                  </span>
                  <form action={withdrawInvestInterest.bind(null, mine.id)}>
                    <SubmitButton variant="secondary" className="btn-sm">{d.invest.withdraw}</SubmitButton>
                  </form>
                </div>
              )}
              <InvestForm
                startupId={startup.id}
                isUpdate={Boolean(mine)}
                defaults={{
                  amount: mine ? String(mine.amount) : need > 0 ? String(Math.min(need, 1_000_000)) : "1000000",
                  format: mine?.format ?? "equity",
                  contact: mine?.contact ?? tg,
                  message: mine?.message ?? "",
                }}
              />
            </>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:pt-10">
        <div className="card p-5">
          {need > 0 ? (
            <>
              <div className="text-xs uppercase tracking-wide text-muted">{d.invest.need}</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{formatPrice(need, locale)}</div>
              {startup.fundingNeedDesc && <p className="mt-3 whitespace-pre-line text-sm text-muted">{startup.fundingNeedDesc}</p>}
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>
                    {d.invest.interested}: <b className="text-fg">{formatPrice(stats.interested, locale)}</b>
                  </span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold">{d.invest.notSeekingLong}</div>
              <p className="mt-1 text-sm text-muted">{d.invest.notSeekingText}</p>
            </>
          )}
          {stats.investors > 0 && (
            <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">
              {stats.investors} {plural(stats.investors, d.invest.investorsForms, locale)}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
