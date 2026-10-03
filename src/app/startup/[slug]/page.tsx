import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getFundingStats } from "@/lib/queries";
import { fetchRecentCommits, fetchRepoInfo, parseGithubUrl } from "@/lib/github";
import { displayName, formatCompact, formatDate, formatPrice, formatRelative, plural } from "@/lib/format";
import { StartupLogo } from "@/components/StartupLogo";
import { TagBadge } from "@/components/TagBadge";
import { Markdown } from "@/components/Markdown";
import { ProgressBar } from "@/components/ProgressBar";
import { Avatar } from "@/components/Avatar";
import { ExternalIcon, EyeIcon, GithubIcon, HeartIcon } from "@/components/icons";
import { getStartupBySlug } from "./data";
import { MAX_MEMBERS } from "@/lib/access";
import { parseRepoMeta } from "@/lib/repo-meta";
import { claimStartup } from "@/app/actions/team";
import { ClaimForm } from "@/components/ClaimForm";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string }; searchParams: { created?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStartupBySlug(params.slug);
  if (!s || s.status !== "APPROVED") return { title: "Стартап" };
  return {
    title: s.name,
    description: s.shortDesc,
    openGraph: { title: s.name, description: s.shortDesc, images: s.coverUrl ?? s.logoUrl ?? undefined },
  };
}

export default async function StartupPage({ params, searchParams }: Props) {
  const [startup, user] = await Promise.all([getStartupBySlug(params.slug), getCurrentUser()]);
  if (!startup) notFound();

  const isMember = Boolean(user && startup.members.some((m) => m.userId === user.id));
  const isAdmin = user?.role === "ADMIN";
  const isOwner = isMember || isAdmin; // может управлять карточкой
  const claimed = startup.members.length > 0;
  const meta = parseRepoMeta(startup.repoMeta);
  const pendingClaim =
    user && !isMember
      ? await prisma.claimRequest.findUnique({
          where: { startupId_userId: { startupId: startup.id, userId: user.id } },
          select: { status: true },
        })
      : null;
  if (startup.status !== "APPROVED" && !isOwner && !isAdmin) notFound();

  if (startup.status === "APPROVED" && !isMember) {
    await prisma.startup.update({ where: { id: startup.id }, data: { viewsCount: { increment: 1 } } });
  }

  const repo = parseGithubUrl(startup.githubUrl);
  const [funding, repoInfo, commits] = await Promise.all([
    getFundingStats(startup.id),
    repo ? fetchRepoInfo(repo) : Promise.resolve(null),
    repo && !meta?.commits?.length ? fetchRecentCommits(repo, 5) : Promise.resolve([]),
  ]);

  const stars = repoInfo?.stars ?? startup.githubStars;
  const lastPush = repoInfo?.pushedAt ?? startup.githubLastCommit;
  const canPreorder = startup.preOrderEnabled && startup.preOrderPrice > 0 && startup.status === "APPROVED";
  const sponsorHref = `/startup/${startup.slug}/sponsor`;

  return (
    <div className="pb-28 lg:pb-0">
      {startup.coverUrl && (
        <div className="h-40 w-full overflow-hidden bg-surface-2 sm:h-56 lg:h-72">
          <img src={startup.coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <StatusBanner status={startup.status} created={searchParams.created === "1"} isOwner={isOwner} />

        <nav className="mb-4 text-sm text-muted">
          <Link href="/" className="hover:text-fg">Каталог</Link>
          <span className="mx-2">/</span>
          <span className="text-fg">{startup.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* Левая колонка */}
          <div className="min-w-0 space-y-6">
            <section className="card p-5 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={96} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{startup.name}</h1>
                    {isOwner && (
                      <Link href={`/startup/${startup.slug}/edit`} className="btn-secondary btn-sm">Редактировать</Link>
                    )}
                  </div>
                  <p className="mt-2 text-[15px] text-muted">{startup.shortDesc}</p>
                  {startup.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {startup.tags.map((t) => (
                        <TagBadge key={t.id} name={t.name} color={t.color} size="md" href={`/?tag=${encodeURIComponent(t.name)}`} />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {startup.demoUrl && <ExtLink href={startup.demoUrl} primary>Открыть демо</ExtLink>}
                    {startup.websiteUrl && <ExtLink href={startup.websiteUrl}>Сайт</ExtLink>}
                    {startup.githubUrl && (
                      <ExtLink href={startup.githubUrl}>
                        <GithubIcon className="h-4 w-4" /> GitHub
                      </ExtLink>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-sm text-muted">
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
                  <span>Команда «{meta.team}»</span>
                ) : null}
                <span className="inline-flex items-center gap-1.5"><EyeIcon className="h-4 w-4" /> {formatCompact(startup.viewsCount)}</span>
                <span className="inline-flex items-center gap-1.5"><HeartIcon className="h-4 w-4" /> {funding.sponsors.length} {plural(funding.sponsors.length, ["спонсор", "спонсора", "спонсоров"])}</span>
                <span>с {formatDate(startup.createdAt)}</span>
              </div>
            </section>

            <section className="card p-5 sm:p-7">
              <h2 className="mb-4 text-lg font-bold">О проекте</h2>
              <Markdown>{startup.fullDesc}</Markdown>
            </section>

            {startup.readme && (
              <section className="card p-5 sm:p-7" id="readme">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">README</h2>
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
                    repo={
                      repo
                        ? { ...repo, dir: meta?.readmePath?.includes("/") ? meta.readmePath.replace(/\/[^/]*$/, "") : undefined }
                        : undefined
                    }
                  >
                    {startup.readme}
                  </Markdown>
                </div>
              </section>
            )}

            {repo && (
              <section className="card p-5 sm:p-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <GithubIcon className="h-5 w-5" /> GitHub
                  </h2>
                  <a href={startup.githubUrl ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                    {repo.owner}/{repo.repo}
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Звёзды" value={`⭐ ${formatCompact(stars)}`} />
                  <Stat label="Форки" value={repoInfo ? formatCompact(repoInfo.forks) : "—"} />
                  <Stat label="Язык" value={repoInfo?.language ?? "—"} />
                  <Stat label="Последний push" value={lastPush ? formatRelative(lastPush) : "—"} />
                </div>
                {commits.length > 0 && (
                  <ul className="mt-5 divide-y divide-border/60 rounded-lg border border-border/60">
                    {commits.map((c) => (
                      <li key={c.sha} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <a href={c.url} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs text-accent hover:underline">{c.sha}</a>
                        <span className="min-w-0 flex-1 truncate">{c.message}</span>
                        <span className="hidden shrink-0 text-xs text-muted sm:inline">{c.author} · {formatRelative(c.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {meta && <RepoDetails meta={meta} repoUrl={`https://github.com/${repo.owner}/${repo.repo}`} />}
                {!repoInfo && !meta && (
                  <p className="mt-4 text-sm text-muted">Не удалось получить данные GitHub (репозиторий приватный или исчерпан лимит API).</p>
                )}
              </section>
            )}

            <section className="card p-5 sm:p-7" id="sponsors">
              <h2 className="mb-4 text-lg font-bold">
                Спонсоры <span className="font-normal text-muted">{funding.sponsors.length}</span>
              </h2>
              {funding.sponsors.length === 0 ? (
                <p className="text-sm text-muted">Пока никого — станьте первым, кто поддержит проект.</p>
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
            </section>
          </div>

          {/* Правая колонка — sticky-блок предзаказа */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5 sm:p-6">
              {canPreorder ? (
                <>
                  <div className="text-xs uppercase tracking-wide text-muted">Предзаказ услуги от</div>
                  <div className="mt-1 text-3xl font-bold">{formatPrice(startup.preOrderPrice)}</div>
                  {startup.preOrderDesc && (
                    <p className="mt-3 whitespace-pre-line text-sm text-muted">{startup.preOrderDesc}</p>
                  )}
                  {startup.preOrderGoal > 0 && (
                    <div className="mt-5"><ProgressBar raised={funding.raised} goal={startup.preOrderGoal} /></div>
                  )}
                  {!isMember ? (
                    <Link href={sponsorHref} className="btn-primary mt-5 w-full py-3 text-base">Стать спонсором</Link>
                  ) : (
                    <Link href="/dashboard" className="btn-secondary mt-5 w-full">Предзаказы в кабинете</Link>
                  )}
                  {!claimed && (
                    <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs">
                      Команда ещё не подтвердила проект на AYMA. Предзаказ сохранится, и команда свяжется с вами, когда заберёт проект.
                    </p>
                  )}
                  <p className="mt-3 text-center text-xs text-muted">
                    Это покупка услуги, а не инвестиция. <Link href="/terms" className="underline">Условия</Link>
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-semibold">Предзаказ пока не открыт</div>
                  <p className="mt-1 text-sm text-muted">Следите за проектом на GitHub или в Telegram фаундера.</p>
                </div>
              )}

              <TeamCard
                members={startup.members}
                isMember={isMember}
                loggedIn={Boolean(user)}
                hasGithub={Boolean(user?.githubLogin)}
                pendingStatus={pendingClaim?.status ?? null}
                claimAction={claimStartup.bind(null, startup.id)}
                loginHref={`/login?next=${encodeURIComponent(`/startup/${startup.slug}`)}`}
              />

              {funding.sponsors.length > 0 && (
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="mb-2 text-xs font-medium text-muted">Уже поддержали</div>
                  <div className="flex -space-x-2">
                    {funding.sponsors.slice(0, 10).map((s) => (
                      <Avatar key={s.id} user={s} size={32} className="ring-2 ring-surface" />
                    ))}
                    {funding.sponsors.length > 10 && (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs ring-2 ring-surface">
                        +{funding.sponsors.length - 10}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Мобильная нижняя панель (как в маркетплейсах) */}
      {canPreorder && !isMember && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="leading-tight">
              <div className="text-[11px] text-muted">Предзаказ от</div>
              <div className="text-lg font-bold">{formatPrice(startup.preOrderPrice)}</div>
            </div>
            <Link href={sponsorHref} className="btn-primary flex-1 py-3 sm:flex-none sm:px-8">Стать спонсором</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ status, created, isOwner }: { status: string; created: boolean; isOwner: boolean }) {
  if (status === "PENDING")
    return (
      <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        {created ? "🎉 Стартап создан! " : ""}Карточка на модерации и пока видна только {isOwner ? "вам" : "фаундеру"} и администраторам.
      </div>
    );
  if (status === "REJECTED")
    return (
      <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        Карточка отклонена модератором. Отредактируйте её — она снова уйдёт на проверку.
      </div>
    );
  if (created)
    return (
      <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">🎉 Стартап опубликован!</div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 truncate font-semibold">{value}</div>
    </div>
  );
}

type TeamMember = {
  id: string;
  role: "OWNER" | "MEMBER";
  user: { id: string; username: string | null; firstName: string | null; avatarUrl: string | null; githubLogin: string | null };
};

function TeamCard({
  members,
  isMember,
  loggedIn,
  hasGithub,
  pendingStatus,
  claimAction,
  loginHref,
}: {
  members: TeamMember[];
  isMember: boolean;
  loggedIn: boolean;
  hasGithub: boolean;
  pendingStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  claimAction: Parameters<typeof ClaimForm>[0]["action"];
  loginHref: string;
}) {
  const full = members.length >= MAX_MEMBERS;
  return (
    <div className="mt-5 border-t border-border/60 pt-4" id="team">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
        <span>Команда на AYMA</span>
        <span>
          {members.length} из {MAX_MEMBERS}
        </span>
      </div>
      {members.length > 0 ? (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <Avatar user={m.user} size={28} />
              <span className="min-w-0 flex-1 truncate">
                {m.user.firstName ?? displayName(m.user)}
                {m.user.githubLogin && <span className="ml-1 text-xs text-muted">@{m.user.githubLogin}</span>}
              </span>
              {m.role === "OWNER" && <span className="text-[11px] text-muted">владелец</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Проект пока никто не забрал.</p>
      )}

      {!isMember && !full && (
        <div className="mt-4">
          {!loggedIn ? (
            <Link href={loginHref} className="btn-secondary w-full">
              <GithubIcon className="h-4 w-4" /> Это мой проект — войти через GitHub
            </Link>
          ) : pendingStatus === "PENDING" ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">Ваша заявка на проверке у команды или модератора.</p>
          ) : (
            <ClaimForm action={claimAction} hasGithub={hasGithub} />
          )}
        </div>
      )}
      {isMember && (
        <Link href="/dashboard" className="mt-3 block text-sm text-accent hover:underline">
          Управлять командой и карточкой →
        </Link>
      )}
    </div>
  );
}

function RepoDetails({ meta, repoUrl }: { meta: NonNullable<ReturnType<typeof parseRepoMeta>>; repoUrl: string }) {
  // в выгрузке встречаются дубли коммитов (ветки) — убираем
  const seen = new Set<string>();
  const commits = (meta.commits ?? []).filter((c) => {
    const k = c.join("|");
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const newestFirst = [...commits].reverse();
  const authors = meta.authors ?? [];
  const tree = meta.tree ?? [];
  const branches = meta.branches ?? [];
  const fmt = (d: string) => d.replace("T", " ");

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Коммиты" value={String(commits.length)} />
        <Stat label="Авторы" value={String(authors.length)} />
        <Stat label="Файлы" value={String(tree.length)} />
        <Stat label="Ветки" value={String(branches.length || 1)} />
      </div>

      {authors.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Авторы коммитов</h3>
          <div className="flex flex-wrap gap-1.5">
            {authors.map(([name, n]) => (
              <span key={name} className="rounded-md bg-surface-2 px-2 py-1 text-xs">
                {name} <b className="font-semibold text-muted">{n}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {newestFirst.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">История коммитов</h3>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
            {newestFirst.slice(0, 8).map(([date, author, msg], i) => (
              <li key={i} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 font-mono text-xs text-muted">{fmt(date)}</span>
                <span className="min-w-0 flex-1 truncate">{msg}</span>
                <span className="shrink-0 text-xs text-muted">{author}</span>
              </li>
            ))}
          </ul>
          {newestFirst.length > 8 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-accent">Все коммиты ({newestFirst.length})</summary>
              <ul className="mt-2 max-h-96 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60 text-sm">
                {newestFirst.slice(8).map(([date, author, msg], i) => (
                  <li key={i} className="flex flex-col gap-0.5 px-4 py-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="shrink-0 font-mono text-xs text-muted">{fmt(date)}</span>
                    <span className="min-w-0 flex-1 truncate">{msg}</span>
                    <span className="shrink-0 text-xs text-muted">{author}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {tree.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Структура репозитория ({tree.length} файлов)</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-surface-2 p-4 font-mono text-xs leading-5">
            {tree.join("\n")}
          </pre>
        </details>
      )}

      {branches.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Ветки ({branches.length})</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {branches.map((b) => (
              <a
                key={b}
                href={`${repoUrl}/tree/${encodeURIComponent(b)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs hover:text-accent"
              >
                {b}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
