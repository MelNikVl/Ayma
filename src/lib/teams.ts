import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { parseRepoMeta } from "./repo-meta";

export const TEAMS_PAGE_SIZE = 30;
export type TeamFilter = "ayma" | "collab";

const teamSelect = {
  id: true,
  slug: true,
  name: true,
  shortDesc: true,
  logoUrl: true,
  score: true,
  votesCount: true,
  openToCollab: true,
  repoMeta: true,
  members: {
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      user: { select: { id: true, firstName: true, username: true, avatarUrl: true, githubLogin: true, linkedinUrl: true, resumeUrl: true } },
    },
  },
} satisfies Prisma.StartupSelect;

/** Команда = проект + авторы коммитов из атласа + участники, подтвердившие проект на AYMA */
export async function listTeams(opts: { q?: string; filters?: TeamFilter[]; page?: number }) {
  const and: Prisma.StartupWhereInput[] = [{ status: "APPROVED" }];
  if (opts.q) {
    and.push({
      OR: [
        { name: { contains: opts.q, mode: "insensitive" } },
        { repoMeta: { path: ["team"], string_contains: opts.q } },
        { members: { some: { user: { githubLogin: { contains: opts.q, mode: "insensitive" } } } } },
      ],
    });
  }
  if (opts.filters?.includes("ayma")) and.push({ members: { some: {} } });
  if (opts.filters?.includes("collab")) and.push({ openToCollab: true });
  const where: Prisma.StartupWhereInput = { AND: and };
  const page = Math.max(1, opts.page ?? 1);

  const [rows, total, onAyma] = await Promise.all([
    prisma.startup.findMany({
      where,
      // сначала команды, которые уже на AYMA, затем по рейтингу
      orderBy: [{ members: { _count: "desc" } }, { score: "desc" }, { votesCount: "desc" }],
      take: TEAMS_PAGE_SIZE,
      skip: (page - 1) * TEAMS_PAGE_SIZE,
      select: teamSelect,
    }),
    prisma.startup.count({ where }),
    prisma.startup.count({ where: { status: "APPROVED", members: { some: {} } } }),
  ]);

  const items = rows.map((s) => {
    const meta = parseRepoMeta(s.repoMeta);
    // авторы коммитов: схлопываем дубли, сортируем по вкладу
    const byName = new Map<string, number>();
    for (const [name, n] of meta?.authors ?? []) byName.set(name, (byName.get(name) ?? 0) + n);
    const authors = [...byName.entries()].sort((a, b) => b[1] - a[1]).map(([name, commits]) => ({ name, commits }));
    return {
      id: s.id,
      slug: s.slug,
      project: s.name,
      shortDesc: s.shortDesc,
      logoUrl: s.logoUrl,
      score: s.score,
      votesCount: s.votesCount,
      openToCollab: s.openToCollab,
      team: meta?.team?.trim() || s.name,
      authors,
      members: s.members,
    };
  });
  return { items, total, page, pages: Math.max(1, Math.ceil(total / TEAMS_PAGE_SIZE)), onAyma };
}
