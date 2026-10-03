import Link from "next/link";
import { notFound } from "next/navigation";
import type { Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { displayName, formatPrice, formatRelative } from "@/lib/format";
import { setStartupStatus } from "@/app/actions/admin";
import { StartupLogo } from "@/components/StartupLogo";
import { StatusPill } from "@/components/StatusPill";
import { cn } from "@/lib/cn";

export const metadata = { title: "Модерация" };
export const dynamic = "force-dynamic";

const tabs: { key: Status; label: string }[] = [
  { key: "PENDING", label: "На модерации" },
  { key: "APPROVED", label: "Опубликованные" },
  { key: "REJECTED", label: "Отклонённые" },
];

export default async function AdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();

  const status: Status = tabs.some((t) => t.key === searchParams.status) ? (searchParams.status as Status) : "PENDING";

  const [counts, startups, stats] = await Promise.all([
    prisma.startup.groupBy({ by: ["status"], _count: true }),
    prisma.startup.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      take: 100,
      include: { founder: { select: { username: true, firstName: true } }, tags: { select: { name: true } } },
    }),
    prisma.preOrder.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
  ]);
  const countOf = (s: Status) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Модерация</h1>
      <p className="mt-1 text-sm text-muted">
        Оплачено предзаказов: {stats._count} на {formatPrice(stats._sum.amount ?? 0)}
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin?status=${t.key}`}
            className={cn("chip", status === t.key ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
          >
            {t.label} · {countOf(t.key)}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {startups.length === 0 && <div className="card p-6 text-center text-sm text-muted">Пусто 🎉</div>}
        {startups.map((s) => (
          <div key={s.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <StartupLogo name={s.name} logoUrl={s.logoUrl} size={44} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/startup/${s.slug}`} className="font-semibold hover:text-accent">{s.name}</Link>
                  <StatusPill status={s.status} />
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.shortDesc}</p>
                <div className="mt-1 text-xs text-muted">
                  {displayName(s.founder)} · {formatRelative(s.createdAt)}
                  {s.preOrderEnabled && ` · предзаказ ${formatPrice(s.preOrderPrice)}`}
                  {s.tags.length > 0 && ` · ${s.tags.map((t) => t.name).join(", ")}`}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {s.status !== "APPROVED" && (
                <form action={setStartupStatus.bind(null, s.id, "APPROVED")}>
                  <button className="btn-primary btn-sm" type="submit">Одобрить</button>
                </form>
              )}
              {s.status !== "REJECTED" && (
                <form action={setStartupStatus.bind(null, s.id, "REJECTED")}>
                  <button className="btn-secondary btn-sm text-danger" type="submit">Отклонить</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
