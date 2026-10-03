import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const PAGE_SIZE = 24;

export type SortKey = "score" | "week" | "votes" | "new" | "stars";
export const SORT_KEYS: SortKey[] = ["score", "week", "votes", "new", "stars"];
export type QuickFilter = "api" | "collab" | "funding" | "claimed";
export const QUICK_FILTERS: QuickFilter[] = ["api", "collab", "funding", "claimed"];

export const startupCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDesc: true,
  logoUrl: true,
  githubUrl: true,
  githubStars: true,
  githubLastCommit: true,
  preOrderEnabled: true,
  preOrderPrice: true,
  score: true,
  votesCount: true,
  apiStatus: true,
  openToCollab: true,
  fundingNeed: true,
  pageAccent: true,
  _count: { select: { members: true } },
  tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
} satisfies Prisma.StartupSelect;

export type StartupCardData = Prisma.StartupGetPayload<{ select: typeof startupCardSelect }>;

const WEEK_MS = 7 * 24 * 3600 * 1000;

function buildWhere(opts: { q?: string; tag?: string; filters?: QuickFilter[] }): Prisma.StartupWhereInput {
  const where: Prisma.StartupWhereInput = { status: "APPROVED" };
  const and: Prisma.StartupWhereInput[] = [];
  if (opts.q) {
    and.push({
      OR: [
        { name: { contains: opts.q, mode: "insensitive" } },
        { shortDesc: { contains: opts.q, mode: "insensitive" } },
        { tags: { some: { name: { contains: opts.q, mode: "insensitive" } } } },
        { members: { some: { user: { githubLogin: { contains: opts.q, mode: "insensitive" } } } } },
      ],
    });
  }
  if (opts.tag) and.push({ tags: { some: { name: { equals: opts.tag, mode: "insensitive" } } } });
  for (const f of opts.filters ?? []) {
    if (f === "api") and.push({ apiStatus: { in: ["PUBLIC", "BETA"] } });
    if (f === "collab") and.push({ openToCollab: true });
    if (f === "funding") and.push({ fundingNeed: { gt: 0 } });
    if (f === "claimed") and.push({ members: { some: {} } });
  }
  if (and.length) where.AND = and;
  return where;
}

/** Голоса за последние 7 дней по проектам */
export async function weeklyVotes(startupIds?: string[]): Promise<Map<string, number>> {
  const rows = await prisma.vote.groupBy({
    by: ["startupId"],
    where: { createdAt: { gte: new Date(Date.now() - WEEK_MS) }, ...(startupIds ? { startupId: { in: startupIds } } : {}) },
    _count: true,
  });
  return new Map(rows.map((r) => [r.startupId, r._count]));
}

export async function listStartups(opts: {
  q?: string;
  tag?: string;
  sort?: SortKey;
  page?: number;
  filters?: QuickFilter[];
}) {
  const page = Math.max(1, opts.page ?? 1);
  const where = buildWhere(opts);
  const total = await prisma.startup.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const skip = (page - 1) * PAGE_SIZE;

  if (opts.sort === "week") {
    // сначала проекты с голосами за неделю, затем остальные по рейтингу
    const week = await weeklyVotes();
    const weekIdsAll = [...week.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const weekMatching = weekIdsAll.length
      ? (await prisma.startup.findMany({ where: { AND: [where, { id: { in: weekIdsAll } }] }, select: { id: true } })).map((s) => s.id)
      : [];
    const weekIds = weekIdsAll.filter((id) => weekMatching.includes(id));
    const headIds = weekIds.slice(skip, skip + PAGE_SIZE);
    const head = headIds.length
      ? await prisma.startup.findMany({ where: { id: { in: headIds } }, select: startupCardSelect })
      : [];
    head.sort((a, b) => headIds.indexOf(a.id) - headIds.indexOf(b.id));
    const restNeeded = PAGE_SIZE - head.length;
    const restSkip = Math.max(0, skip - weekIds.length);
    const rest =
      restNeeded > 0
        ? await prisma.startup.findMany({
            where: { AND: [where, { id: { notIn: weekIds } }] },
            orderBy: [{ score: "desc" }, { createdAt: "desc" }],
            select: startupCardSelect,
            take: restNeeded,
            skip: restSkip,
          })
        : [];
    return { items: [...head, ...rest], total, page, pages, week };
  }

  const orderBy: Prisma.StartupOrderByWithRelationInput[] =
    opts.sort === "new"
      ? [{ createdAt: "desc" }]
      : opts.sort === "stars"
        ? [{ githubStars: "desc" }, { score: "desc" }]
        : opts.sort === "votes"
          ? [{ votesCount: "desc" }, { score: "desc" }]
          : [{ score: "desc" }, { votesCount: "desc" }, { createdAt: "desc" }];

  const items = await prisma.startup.findMany({ where, orderBy, select: startupCardSelect, take: PAGE_SIZE, skip });
  return { items, total, page, pages, week: await weeklyVotes(items.map((i) => i.id)) };
}

/** Какие из проектов уже отмечены голосом пользователя */
export async function userVotes(userId: string | undefined, startupIds: string[]): Promise<Set<string>> {
  if (!userId || startupIds.length === 0) return new Set();
  const rows = await prisma.vote.findMany({ where: { userId, startupId: { in: startupIds } }, select: { startupId: true } });
  return new Set(rows.map((r) => r.startupId));
}

/** Цифры для героя главной */
export async function catalogStats() {
  const [projects, developers, api, collab] = await Promise.all([
    prisma.startup.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { memberships: { some: {} } } }),
    prisma.startup.count({ where: { status: "APPROVED", apiStatus: { in: ["PUBLIC", "BETA"] } } }),
    prisma.startup.count({ where: { status: "APPROVED", openToCollab: true } }),
  ]);
  return { projects, developers, api, collab };
}

/** Проект недели: больше всего голосов за 7 дней, иначе лучший по рейтингу */
export async function spotlight() {
  const week = await weeklyVotes();
  const topId = [...week.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const item = topId
    ? await prisma.startup.findFirst({ where: { id: topId, status: "APPROVED" }, select: { ...startupCardSelect, coverUrl: true } })
    : null;
  if (item) return { item, weekVotes: week.get(item.id) ?? 0 };
  const best = await prisma.startup.findFirst({
    where: { status: "APPROVED" },
    orderBy: [{ score: "desc" }, { votesCount: "desc" }],
    select: { ...startupCardSelect, coverUrl: true },
  });
  return best ? { item: best, weekVotes: 0 } : null;
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

/** Теги для фильтра каталога: только те, у которых есть опубликованные стартапы, популярные первыми. */
export async function listCatalogTags() {
  const tags = await prisma.tag.findMany({
    where: { startups: { some: { status: "APPROVED" } } },
    include: { _count: { select: { startups: { where: { status: "APPROVED" } } } } },
  });
  return tags.sort((a, b) => b._count.startups - a._count.startups || a.name.localeCompare(b.name));
}

/** Сумма оплаченных предзаказов и уникальные спонсоры. */
export async function getFundingStats(startupId: string) {
  const [agg, paid] = await Promise.all([
    prisma.preOrder.aggregate({
      where: { startupId, status: "PAID" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.preOrder.findMany({
      where: { startupId, status: "PAID" },
      orderBy: { createdAt: "desc" },
      select: {
        sponsor: { select: { id: true, username: true, firstName: true, avatarUrl: true } },
      },
      take: 200,
    }),
  ]);

  const seen = new Set<string>();
  const sponsors = paid
    .map((p) => p.sponsor)
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  return { raised: agg._sum.amount ?? 0, ordersCount: agg._count, sponsors };
}

export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 1000; i++) {
    const existing = await prisma.startup.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
