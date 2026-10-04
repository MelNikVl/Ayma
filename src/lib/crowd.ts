import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { parseFundingBreakdown } from "./funding";

export type CrowdSort = "new" | "big" | "small" | "popular";
export const CROWD_SORTS: CrowdSort[] = ["new", "big", "small", "popular"];

/** Проекты, которые ищут инвестиции, + заявленный интерес инвесторов */
export async function listCrowd(sort: CrowdSort) {
  const orderBy: Prisma.StartupOrderByWithRelationInput[] =
    sort === "big"
      ? [{ fundingNeed: "desc" }]
      : sort === "small"
        ? [{ fundingNeed: "asc" }]
        : sort === "popular"
          ? [{ investInterests: { _count: "desc" } }, { votesCount: "desc" }]
          : [{ updatedAt: "desc" }];
  const rows = await prisma.startup.findMany({
    where: { status: "APPROVED", fundingNeed: { gt: 0 } },
    orderBy,
    take: 60,
    select: {
      id: true,
      slug: true,
      name: true,
      shortDesc: true,
      logoUrl: true,
      coverUrl: true,
      pageAccent: true,
      score: true,
      votesCount: true,
      isDemo: true,
      fundingNeed: true,
      fundingNeedDesc: true,
      fundingBreakdown: true,
      fundingContact: true,
      buildMonths: true,
      tags: { select: { name: true }, take: 3 },
      _count: { select: { members: true, comments: true } },
    },
  });
  const interest = await prisma.investInterest.groupBy({
    by: ["startupId"],
    where: { startupId: { in: rows.map((r) => r.id) }, status: { in: ["NEW", "IN_TALKS"] } },
    _sum: { amount: true },
    _count: true,
  });
  const byId = new Map(interest.map((i) => [i.startupId, { sum: i._sum.amount ?? 0, count: i._count }]));
  const items = rows.map((r) => ({
    ...r,
    breakdown: parseFundingBreakdown(r.fundingBreakdown),
    interested: byId.get(r.id)?.sum ?? 0,
    investors: byId.get(r.id)?.count ?? 0,
  }));
  const total = items.reduce((a, r) => a + (r.fundingNeed ?? 0), 0);
  const interestTotal = items.reduce((a, r) => a + r.interested, 0);
  return { items, total, interestTotal };
}
