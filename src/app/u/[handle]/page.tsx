import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { displayName } from "@/lib/format";
import { levelFor } from "@/lib/levels";
import { USER_SCORE_MAX, type UserScoreParts } from "@/lib/score";
import { startupCardSelect, userVotes } from "@/lib/queries";
import { getI18n } from "@/i18n/server";
import { fill, formatDate } from "@/i18n/format";
import { Avatar } from "@/components/Avatar";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { StartupCard } from "@/components/StartupCard";
import { CollabForm } from "@/components/CollabForm";
import { CollabBadge } from "@/components/Badges";
import { ExternalIcon, GithubIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const findUser = cache(async (handle: string) => {
  const h = decodeURIComponent(handle);
  const select = {
    id: true, username: true, firstName: true, avatarUrl: true, githubLogin: true, bio: true, skills: true,
    contactUrl: true, openToCollab: true, score: true, scoreData: true, createdAt: true,
  } as const;
  return (
    (await prisma.user.findFirst({ where: { githubLogin: { equals: h, mode: "insensitive" } }, select })) ??
    (await prisma.user.findFirst({ where: { username: { equals: h, mode: "insensitive" }, githubLogin: null }, select })) ??
    (await prisma.user.findUnique({ where: { id: h }, select }))
  );
});

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const u = await findUser(params.handle);
  return { title: u ? (u.firstName ?? displayName(u)) : "AYMA" };
}

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const { d, locale } = getI18n();
  const u = await findUser(params.handle);
  if (!u || (u.username === null && u.githubLogin === null && u.firstName === null)) notFound();

  const viewer = await getCurrentUser();
  const [projects, myStartups] = await Promise.all([
    prisma.startup.findMany({
      where: { members: { some: { userId: u.id } }, status: "APPROVED" },
      orderBy: { score: "desc" },
      select: startupCardSelect,
    }),
    viewer && viewer.id !== u.id
      ? prisma.startup.findMany({ where: { members: { some: { userId: viewer.id } } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const voted = await userVotes(viewer?.id, projects.map((p) => p.id));
  const parts = (u.scoreData ?? {}) as Partial<UserScoreParts>;
  const hints: Record<keyof UserScoreParts, string> = {
    projects: d.score.hints.projects,
    support: d.score.hints.devSupport,
    collab: d.score.hints.collab,
    profile: d.score.hints.devProfile,
  };
  const labels: Record<keyof UserScoreParts, string> = {
    projects: d.score.parts.projects,
    support: d.score.parts.support,
    collab: d.score.parts.collab,
    profile: d.score.parts.profile,
  };
  const name = u.firstName ?? displayName(u);

  return (
    <div>
      <div className="hero-mesh border-b border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <Avatar user={u} size={112} className="ring-4 ring-surface" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {u.githubLogin && (
                <a href={`https://github.com/${u.githubLogin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <GithubIcon className="h-4 w-4" /> {u.githubLogin}
                </a>
              )}
              <span>{fill(d.profile.memberSince, { date: formatDate(u.createdAt, locale) })}</span>
              {u.openToCollab && <CollabBadge label={d.collab.open} />}
            </div>
            {u.bio && <p className="mt-3 max-w-2xl">{u.bio}</p>}
            {u.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {u.skills.map((s) => (
                  <span key={s} className="rounded-md bg-surface px-2 py-1 text-xs font-medium shadow-card">{s}</span>
                ))}
              </div>
            )}
            {u.contactUrl && (
              <a href={u.contactUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary btn-sm mt-4">
                {d.profile.contact} <ExternalIcon className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h2 className="mb-4 text-xl font-bold">{d.profile.projects}</h2>
          {projects.length === 0 ? (
            <p className="card p-6 text-sm text-muted">{d.profile.noProjects}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <StartupCard key={p.id} startup={p} voted={voted.has(p.id)} />
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <ScoreBreakdown
              score={u.score}
              levelLabel={d.score.levels[levelFor(u.score)]}
              parts={(Object.keys(USER_SCORE_MAX) as (keyof UserScoreParts)[]).map((k) => ({
                key: k,
                label: labels[k],
                hint: hints[k],
                value: parts[k] ?? 0,
                max: USER_SCORE_MAX[k],
              }))}
            />
          </div>
          {viewer?.id !== u.id && (
            <div className="card p-5">
              <CollabForm
                toUserId={u.id}
                targetName={name}
                myStartups={myStartups}
                loggedIn={Boolean(viewer)}
                loginHref={`/login?next=${encodeURIComponent(`/u/${params.handle}`)}`}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
