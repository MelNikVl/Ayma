import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const PAGE_SIZE = 24;

export type SortKey = "popular" | "new" | "stars";

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
  tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
} satisfies Prisma.StartupSelect;

export type StartupCardData = Prisma.StartupGetPayload<{ select: typeof startupCardSelect }>;

export async function listStartups(opts: { q?: string; tag?: string; sort?: SortKey; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.StartupWhereInput = { status: "APPROVED" };

  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { shortDesc: { contains: opts.q, mode: "insensitive" } },
      { tags: { some: { name: { contains: opts.q, mode: "insensitive" } } } },
    ];
  }
  if (opts.tag) where.tags = { some: { name: { equals: opts.tag, mode: "insensitive" } } };

  const orderBy: Prisma.StartupOrderByWithRelationInput[] =
    opts.sort === "new"
      ? [{ createdAt: "desc" }]
      : opts.sort === "stars"
        ? [{ githubStars: "desc" }, { createdAt: "desc" }]
        : [{ viewsCount: "desc" }, { githubStars: "desc" }, { createdAt: "desc" }];

  const [items, total] = await prisma.$transaction([
    prisma.startup.findMany({
      where,
      orderBy,
      select: startupCardSelect,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.startup.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
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
