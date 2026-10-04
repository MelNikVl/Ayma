import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { fill, formatMoneyShort } from "@/i18n/format";
import { StartupLogo } from "@/components/StartupLogo";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.crowd.startTitle };
}

/** Команда выбирает свой проект и переходит к блоку «Инвестиции» в карточке */
export default async function CrowdStartPage() {
  const { d, locale } = getI18n();
  const user = await getCurrentUser();
  const projects = user
    ? await prisma.startup.findMany({
        where: { members: { some: { userId: user.id } } },
        select: { id: true, slug: true, name: true, logoUrl: true, fundingNeed: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/crowdfunding" className="text-sm text-muted hover:text-fg">← {d.crowd.title}</Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{d.crowd.startTitle}</h1>
      <p className="mt-2 text-muted">{d.crowd.startText}</p>

      <div className="mt-6">
        {!user ? (
          <Link href="/login?next=/crowdfunding/start" className="btn-primary px-6 py-3">{d.crowd.login}</Link>
        ) : projects.length === 0 ? (
          <div className="card p-5 text-sm">
            <p className="text-muted">{d.crowd.noProjects}</p>
            <div className="mt-4 flex gap-2">
              <Link href="/teams" className="btn-secondary">{d.sub.teams}</Link>
              <Link href="/startup/new" className="btn-primary">{d.sub.addProject}</Link>
            </div>
          </div>
        ) : (
          <ul className="card divide-y divide-border/50 p-1.5">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <StartupLogo name={p.name} logoUrl={p.logoUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  {(p.fundingNeed ?? 0) > 0 && (
                    <span className="text-xs font-semibold text-success">
                      {fill(d.crowd.seeking, { amount: formatMoneyShort(p.fundingNeed ?? 0, locale) })}
                    </span>
                  )}
                </span>
                <Link href={`/startup/${p.slug}/edit?tab=invest#funding`} className={(p.fundingNeed ?? 0) > 0 ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>
                  {(p.fundingNeed ?? 0) > 0 ? d.crowd.edit : d.crowd.start}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
