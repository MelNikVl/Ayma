import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";
import { StartupLogo } from "@/components/StartupLogo";
import { Avatar } from "@/components/Avatar";
import { ScorePill } from "@/components/ScoreBadge";
import { ApiBadge, VerifiedIcon } from "@/components/Badges";
import { profileHref } from "@/components/UserMenu";
import { HandshakeIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.collab.pageTitle };
}

export default async function CollabsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { d } = getI18n();
  const tab = searchParams.tab === "devs" ? "devs" : "projects";

  const [projects, devs] = await Promise.all([
    tab === "projects"
      ? prisma.startup.findMany({
          where: { status: "APPROVED", openToCollab: true },
          orderBy: [{ score: "desc" }],
          take: 60,
          select: {
            id: true, slug: true, name: true, shortDesc: true, logoUrl: true, score: true, collabNote: true, apiStatus: true,
            _count: { select: { members: true } },
          },
        })
      : Promise.resolve([]),
    tab === "devs"
      ? prisma.user.findMany({
          where: { openToCollab: true },
          orderBy: [{ score: "desc" }],
          take: 60,
          select: { id: true, username: true, firstName: true, avatarUrl: true, githubLogin: true, bio: true, skills: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#a855f7]/15 text-[#9333ea]"><HandshakeIcon className="h-6 w-6" /></span>
        <h1 className="text-3xl font-extrabold tracking-tight">{d.collab.pageTitle}</h1>
      </div>
      <p className="mt-2 max-w-2xl text-muted">{d.collab.pageText}</p>

      <div className="mt-6 inline-flex rounded-lg bg-surface-2 p-0.5 text-sm">
        {(["projects", "devs"] as const).map((t) => (
          <Link key={t} href={`/collabs?tab=${t}`} className={cn("rounded-md px-4 py-1.5 font-semibold", tab === t ? "bg-surface shadow-card" : "text-muted hover:text-fg")}>
            {t === "projects" ? d.collab.projectsTab : d.collab.devsTab}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tab === "projects" &&
          (projects.length === 0 ? (
            <p className="card col-span-full p-6 text-center text-sm text-muted">{d.collab.empty}</p>
          ) : (
            projects.map((p) => (
              <Link key={p.id} href={`/startup/${p.slug}#team`} className="card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-center gap-3">
                  <StartupLogo name={p.name} logoUrl={p.logoUrl} size={44} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 font-bold">
                      <span className="truncate">{p.name}</span>
                      {p._count.members > 0 && <VerifiedIcon title={d.card.claimedTeam} />}
                    </div>
                    <div className="flex gap-1">
                      <ScorePill score={p.score} />
                      <ApiBadge status={p.apiStatus} label={d.api.status[p.apiStatus]} />
                    </div>
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{p.shortDesc}</p>
                {p.collabNote && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <b>{d.collab.whatWeLook}:</b> {p.collabNote}
                  </p>
                )}
              </Link>
            ))
          ))}
        {tab === "devs" &&
          (devs.length === 0 ? (
            <p className="card col-span-full p-6 text-center text-sm text-muted">{d.collab.empty}</p>
          ) : (
            devs.map((u) => (
              <Link key={u.id} href={profileHref(u)} className="card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <div className="flex items-center gap-3">
                  <Avatar user={u} size={44} />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{u.firstName ?? displayName(u)}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      {u.githubLogin && <span>@{u.githubLogin}</span>}
                      <ScorePill score={u.score} />
                    </div>
                  </div>
                </div>
                {u.bio && <p className="line-clamp-3 text-sm text-muted">{u.bio}</p>}
                {u.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {u.skills.slice(0, 8).map((s) => (
                      <span key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-xs">{s}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))
          ))}
      </div>
    </div>
  );
}
