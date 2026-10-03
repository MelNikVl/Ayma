import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { displayName, formatCompact, formatPrice, formatRelative } from "@/lib/format";
import { refreshGithub } from "@/app/actions/startup";
import { cancelMyPreOrder, setPreOrderStatus } from "@/app/actions/preorder";
import { StartupLogo } from "@/components/StartupLogo";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Мой кабинет" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const [startups, incoming, mine] = await Promise.all([
    prisma.startup.findMany({
      where: { founderId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, name: true, logoUrl: true, status: true, viewsCount: true,
        githubUrl: true, githubStars: true, preOrderGoal: true,
        preOrders: { where: { status: "PAID" }, select: { amount: true } },
      },
    }),
    prisma.preOrder.findMany({
      where: { startup: { founderId: user.id } },
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
  ]);

  const pendingIncoming = incoming.filter((o) => o.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar user={user} size={48} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Мой кабинет</h1>
            <p className="text-sm text-muted">{displayName(user)}</p>
          </div>
        </div>
        <Link href="/startup/new" className="btn-primary">+ Добавить стартап</Link>
      </div>

      {/* Мои стартапы */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Мои стартапы</h2>
        {startups.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            У вас пока нет стартапов. <Link href="/startup/new" className="text-accent hover:underline">Добавьте первый</Link>.
          </div>
        ) : (
          <ul className="space-y-3">
            {startups.map((s) => {
              const raised = s.preOrders.reduce((sum, p) => sum + p.amount, 0);
              return (
                <li key={s.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StartupLogo name={s.name} logoUrl={s.logoUrl} size={44} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/startup/${s.slug}`} className="truncate font-semibold hover:text-accent">{s.name}</Link>
                        <StatusPill status={s.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        👁 {formatCompact(s.viewsCount)} · собрано {formatPrice(raised)}
                        {s.preOrderGoal > 0 && ` из ${formatPrice(s.preOrderGoal)}`}
                        {s.githubUrl && ` · ⭐ ${formatCompact(s.githubStars)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {s.githubUrl && (
                      <form action={refreshGithub.bind(null, s.id)}>
                        <button className="btn-secondary btn-sm" type="submit">Обновить GitHub</button>
                      </form>
                    )}
                    <Link href={`/startup/${s.slug}/edit`} className="btn-secondary btn-sm">Редактировать</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Входящие предзаказы */}
      {startups.length > 0 && (
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
