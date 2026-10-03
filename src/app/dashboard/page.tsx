import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MAX_MEMBERS } from "@/lib/access";
import { displayName, formatCompact, formatPrice, formatRelative } from "@/lib/format";
import { refreshGithub } from "@/app/actions/startup";
import { cancelMyPreOrder, setPreOrderStatus } from "@/app/actions/preorder";
import { approveClaim, rejectClaim, removeMember } from "@/app/actions/team";
import { StartupLogo } from "@/components/StartupLogo";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { GithubIcon } from "@/components/icons";

export const metadata = { title: "Мой кабинет" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const memberships = await prisma.startupMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      startup: {
        select: {
          id: true, slug: true, name: true, logoUrl: true, status: true, viewsCount: true,
          githubUrl: true, githubStars: true, preOrderEnabled: true, preOrderPrice: true, preOrderGoal: true,
          preOrders: { where: { status: "PAID" }, select: { amount: true } },
          members: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true, role: true, userId: true,
              user: { select: { username: true, firstName: true, avatarUrl: true, githubLogin: true } },
            },
          },
        },
      },
    },
  });
  const myStartupIds = memberships.map((m) => m.startup.id);

  const [incoming, mine, teamClaims, myClaims] = await Promise.all([
    prisma.preOrder.findMany({
      where: { startupId: { in: myStartupIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        startup: { select: { name: true, slug: true } },
        sponsor: { select: { username: true, firstName: true, avatarUrl: true } },
      },
    }),
    prisma.preOrder.findMany({
      where: { sponsorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { startup: { select: { name: true, slug: true, logoUrl: true } } },
    }),
    prisma.claimRequest.findMany({
      where: { startupId: { in: myStartupIds }, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        startup: { select: { name: true, slug: true } },
        user: { select: { username: true, firstName: true, avatarUrl: true, githubLogin: true } },
      },
    }),
    prisma.claimRequest.findMany({
      where: { userId: user.id, status: { not: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      include: { startup: { select: { name: true, slug: true, logoUrl: true } } },
    }),
  ]);

  const pendingIncoming = incoming.filter((o) => o.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Профиль */}
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar user={user} size={56} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{user.firstName ?? displayName(user)}</h1>
            <p className="text-sm text-muted">
              {user.githubLogin ? (
                <a href={`https://github.com/${user.githubLogin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <GithubIcon className="h-3.5 w-3.5" /> {user.githubLogin}
                </a>
              ) : (
                "GitHub не привязан"
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!user.githubLogin && (
            <a href="/api/auth/github?next=/dashboard" className="btn-secondary">
              <GithubIcon className="h-4 w-4" /> Привязать GitHub
            </a>
          )}
          <Link href="/" className="btn-secondary">Найти свой проект</Link>
          <Link href="/startup/new" className="btn-primary">+ Добавить стартап</Link>
        </div>
      </div>

      {/* Мои проекты */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Мои проекты</h2>
        {memberships.length === 0 ? (
          <div className="card p-6 text-sm text-muted">
            <p>Вы пока не участник ни одного проекта.</p>
            <p className="mt-2">
              Делали проект на HackAlem или он уже есть в каталоге? Найдите его через{" "}
              <Link href="/" className="text-accent hover:underline">поиск</Link> и нажмите «Это мой проект». Если ваш
              GitHub-логин есть среди авторов коммитов, проект сразу появится здесь. В команде проекта может быть до {MAX_MEMBERS} человек.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {memberships.map(({ role, startup: s }) => {
              const raised = s.preOrders.reduce((sum, p) => sum + p.amount, 0);
              return (
                <li key={s.id} className="card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <StartupLogo name={s.name} logoUrl={s.logoUrl} size={48} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/startup/${s.slug}`} className="truncate font-semibold hover:text-accent">{s.name}</Link>
                          <StatusPill status={s.status} />
                          <span className="text-[11px] text-muted">{role === "OWNER" ? "владелец" : "участник"}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          👁 {formatCompact(s.viewsCount)} ·{" "}
                          {s.preOrderEnabled ? `предзаказ ${formatPrice(s.preOrderPrice)}` : "предзаказ выключен"} · собрано {formatPrice(raised)}
                          {s.preOrderGoal > 0 && ` из ${formatPrice(s.preOrderGoal)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.githubUrl && (
                        <form action={refreshGithub.bind(null, s.id)}>
                          <button className="btn-secondary btn-sm" type="submit">Обновить GitHub</button>
                        </form>
                      )}
                      <Link href={`/startup/${s.slug}/edit`} className="btn-primary btn-sm">Логотип, цена, описание</Link>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="mb-2 text-xs font-medium text-muted">
                      Команда · {s.members.length} из {MAX_MEMBERS}
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {s.members.map((m) => {
                        const self = m.userId === user.id;
                        const canRemove = self || role === "OWNER" || user.role === "ADMIN";
                        return (
                          <li key={m.id} className="flex items-center gap-2 rounded-lg bg-surface-2 py-1 pl-1 pr-2 text-sm">
                            <Avatar user={m.user} size={24} />
                            <span>{m.user.firstName ?? displayName(m.user)}{self && " (вы)"}</span>
                            {m.role === "OWNER" && <span className="text-[11px] text-muted">владелец</span>}
                            {canRemove && (
                              <form action={removeMember.bind(null, m.id)}>
                                <button type="submit" className="text-xs text-danger hover:underline">
                                  {self ? "выйти" : "убрать"}
                                </button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Заявки в мои проекты */}
      {teamClaims.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">
            Заявки в команду <span className="ml-1 rounded-full bg-accent px-2 py-0.5 align-middle text-xs text-white">{teamClaims.length}</span>
          </h2>
          <div className="card divide-y divide-border/60">
            {teamClaims.map((c) => (
              <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar user={c.user} size={36} />
                  <div className="min-w-0 text-sm">
                    <div className="font-semibold">
                      {c.user.firstName ?? displayName(c.user)}
                      {c.user.githubLogin && <span className="ml-1 font-normal text-muted">@{c.user.githubLogin}</span>}
                    </div>
                    <div className="text-xs text-muted">
                      хочет в {c.startup.name} · {formatRelative(c.createdAt)}
                    </div>
                    {c.message && <p className="mt-1 text-sm">«{c.message}»</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveClaim.bind(null, c.id)}>
                    <button className="btn-primary btn-sm" type="submit">Принять</button>
                  </form>
                  <form action={rejectClaim.bind(null, c.id)}>
                    <button className="btn-secondary btn-sm" type="submit">Отклонить</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Мои заявки */}
      {myClaims.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Мои заявки</h2>
          <div className="card divide-y divide-border/60">
            {myClaims.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
                <StartupLogo name={c.startup.name} logoUrl={c.startup.logoUrl} size={32} />
                <Link href={`/startup/${c.startup.slug}`} className="min-w-0 flex-1 truncate font-semibold hover:text-accent">
                  {c.startup.name}
                </Link>
                <span className={c.status === "REJECTED" ? "text-danger" : "text-warning"}>
                  {c.status === "REJECTED" ? "отклонена" : "на проверке"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Входящие предзаказы */}
      {memberships.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">
            Входящие предзаказы
            {pendingIncoming > 0 && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-xs text-white">{pendingIncoming}</span>
            )}
          </h2>
          {incoming.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">Предзаказов пока нет.</div>
          ) : (
            <div className="card divide-y divide-border/60">
              {incoming.map((o) => (
                <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar user={o.sponsor} size={36} />
                    <div className="min-w-0 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{displayName(o.sponsor)}</span>
                        <StatusPill status={o.status} kind="payment" />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {o.startup.name} · {o.quantity} шт. · контакт: {o.contactInfo ?? "—"} · {formatRelative(o.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mr-2 font-bold">{formatPrice(o.amount)}</span>
                    {o.status === "PENDING" && (
                      <>
                        <form action={setPreOrderStatus.bind(null, o.id, "PAID")}>
                          <button className="btn-primary btn-sm" type="submit">Оплачен</button>
                        </form>
                        <form action={setPreOrderStatus.bind(null, o.id, "CANCELED")}>
                          <button className="btn-secondary btn-sm" type="submit">Отменить</button>
                        </form>
                      </>
                    )}
                    {o.status === "PAID" && (
                      <form action={setPreOrderStatus.bind(null, o.id, "PENDING")}>
                        <button className="btn-ghost btn-sm text-muted" type="submit">Вернуть в ожидание</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Мои предзаказы как спонсора */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Мои предзаказы</h2>
        {mine.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            Вы ещё никого не поддержали. <Link href="/" className="text-accent hover:underline">Посмотреть каталог</Link>.
          </div>
        ) : (
          <div className="card divide-y divide-border/60">
            {mine.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <StartupLogo name={o.startup.name} logoUrl={o.startup.logoUrl} size={36} />
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/startup/${o.startup.slug}`} className="font-semibold hover:text-accent">{o.startup.name}</Link>
                      <StatusPill status={o.status} kind="payment" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{o.quantity} шт. · {formatRelative(o.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-2 font-bold">{formatPrice(o.amount)}</span>
                  {o.status === "PENDING" && o.paymentLink && (
                    <a href={o.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">Оплатить</a>
                  )}
                  {o.status === "PENDING" && (
                    <form action={cancelMyPreOrder.bind(null, o.id)}>
                      <button className="btn-secondary btn-sm" type="submit">Отменить</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
