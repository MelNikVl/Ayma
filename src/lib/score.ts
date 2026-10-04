import { prisma } from "./prisma";
import { parseRepoMeta } from "./repo-meta";

/**
 * AYMA Score — рейтинг проекта 0–100. Пять составляющих (максимум в скобках):
 *  - community (30): голоса пользователей + просмотры
 *  - support   (20): оплаченные предзаказы и подтверждённое крипто-спонсорство (USDT)
 *  - tech      (25): зрелость, коммиты, авторы, звёзды GitHub
 *  - profile   (15): насколько полно заполнена и оформлена карточка
 *  - team      (10): команда подтвердила проект, открыта к коллаборациям, есть API
 * Логарифмические шкалы — чтобы первые голоса/звёзды давали заметный прирост,
 * а лидеры не улетали в бесконечность.
 */
export interface StartupScoreParts {
  community: number;
  support: number;
  tech: number;
  profile: number;
  team: number;
}
export const STARTUP_SCORE_MAX: StartupScoreParts = { community: 30, support: 20, tech: 25, profile: 15, team: 10 };

/** Рейтинг разработчика 0–100. */
export interface UserScoreParts {
  projects: number; // (50) рейтинг его проектов
  support: number; // (20) оплаченные предзаказы в его проектах
  collab: number; // (15) принятые коллаборации, открытость
  profile: number; // (15) заполненность профиля
}
export const USER_SCORE_MAX: UserScoreParts = { projects: 50, support: 20, collab: 15, profile: 15 };

const logScale = (value: number, full: number) => Math.min(1, Math.log10(1 + Math.max(0, value)) / Math.log10(1 + full));
const linScale = (value: number, full: number) => Math.min(1, Math.max(0, value) / full);
const r1 = (n: number) => Math.round(n * 10) / 10;

const MATURITY_POINTS: Record<string, number> = {
  "Доведённый продукт": 10,
  "Рабочий MVP": 7,
  Прототип: 4,
  "Без кода": 1,
  Идея: 1,
};

export interface StartupScoreInput {
  votesCount: number;
  viewsCount: number;
  paidAmount: number;
  paidCount: number;
  githubStars: number;
  githubUrl: string | null;
  repoMeta: unknown;
  logoUrl: string | null;
  coverUrl: string | null;
  fullDesc: string;
  readme: string | null;
  roadmap: unknown;
  advantages: string | null;
  implPrice: number | null;
  implDays: number | null;
  apiStatus: string;
  fundingNeed: number | null;
  pageTheme: string;
  pageAccent: string | null;
  demoUrl: string | null;
  membersCount: number;
  openToCollab: boolean;
}

export function computeStartupScore(s: StartupScoreInput): { total: number; parts: StartupScoreParts } {
  const meta = parseRepoMeta(s.repoMeta);
  const commits = new Set((meta?.commits ?? []).map((c) => c.join("|"))).size;
  const authors = meta?.authors?.length ?? 0;
  const roadmapItems = Array.isArray(s.roadmap) ? s.roadmap.length : 0;

  const community = 24 * logScale(s.votesCount, 50) + 6 * logScale(s.viewsCount, 1000);
  const support = 14 * logScale(s.paidAmount / 10_000, 20) + 6 * linScale(s.paidCount, 5);

  const maturity = meta?.maturity ? (MATURITY_POINTS[meta.maturity] ?? 4) : s.githubUrl ? 5 : 2;
  const tech =
    maturity +
    5 * linScale(commits, 50) +
    3 * linScale(authors, 3) +
    7 * logScale(s.githubStars, 100);

  const profile =
    (s.logoUrl ? 2 : 0) +
    (s.coverUrl ? 1 : 0) +
    (s.fullDesc.length + (s.readme?.length ?? 0) >= 600 ? 2 : s.fullDesc.length >= 200 ? 1 : 0) +
    (roadmapItems >= 3 ? 2 : roadmapItems > 0 ? 1 : 0) +
    (s.advantages && s.advantages.length >= 80 ? 2 : s.advantages ? 1 : 0) +
    (s.implPrice || s.implDays ? 2 : 0) +
    (s.fundingNeed ? 1 : 0) +
    (s.demoUrl ? 1 : 0) +
    // оформление страницы тоже влияет
    (s.pageTheme !== "default" || s.pageAccent ? 2 : 0);

  const team =
    (s.membersCount > 0 ? 5 : 0) +
    (s.membersCount > 1 ? 1 : 0) +
    (s.openToCollab ? 2 : 0) +
    (s.apiStatus === "PUBLIC" ? 2 : s.apiStatus === "BETA" ? 1.5 : s.apiStatus === "PLANNED" ? 0.5 : 0);

  const parts: StartupScoreParts = {
    community: r1(Math.min(STARTUP_SCORE_MAX.community, community)),
    support: r1(Math.min(STARTUP_SCORE_MAX.support, support)),
    tech: r1(Math.min(STARTUP_SCORE_MAX.tech, tech)),
    profile: r1(Math.min(STARTUP_SCORE_MAX.profile, profile)),
    team: r1(Math.min(STARTUP_SCORE_MAX.team, team)),
  };
  const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0));
  return { total: Math.min(100, total), parts };
}

const startupScoreSelect = {
  id: true,
  votesCount: true,
  viewsCount: true,
  githubStars: true,
  githubUrl: true,
  repoMeta: true,
  logoUrl: true,
  coverUrl: true,
  fullDesc: true,
  readme: true,
  roadmap: true,
  advantages: true,
  implPrice: true,
  implDays: true,
  apiStatus: true,
  fundingNeed: true,
  pageTheme: true,
  pageAccent: true,
  demoUrl: true,
  openToCollab: true,
  _count: { select: { members: true } },
} as const;

async function paidStats(startupIds: string[]) {
  const rows = await prisma.preOrder.groupBy({
    by: ["startupId"],
    where: { status: "PAID", startupId: { in: startupIds } },
    _sum: { amount: true },
    _count: true,
  });
  const map = new Map(rows.map((r) => [r.startupId, { amount: r._sum.amount ?? 0, count: r._count }]));
  // Крипто-спонсорство (USDT) учитываем по фиксированному курсу — только для рейтинга
  const crypto = await prisma.cryptoDonation.groupBy({
    by: ["startupId"],
    where: { status: "CONFIRMED", startupId: { in: startupIds } },
    _sum: { amountCents: true },
    _count: true,
  });
  for (const c of crypto) {
    const prev = map.get(c.startupId) ?? { amount: 0, count: 0 };
    map.set(c.startupId, {
      amount: prev.amount + Math.round(((c._sum.amountCents ?? 0) / 100) * USDT_KZT_FOR_SCORE),
      count: prev.count + c._count,
    });
  }
  return map;
}

/** Курс USDT→₸ для рейтинга (приблизительный, на отображение сумм не влияет) */
const USDT_KZT_FOR_SCORE = 500;

export async function recomputeStartupScores(ids?: string[]): Promise<number> {
  const startups = await prisma.startup.findMany({
    where: ids ? { id: { in: ids } } : undefined,
    select: startupScoreSelect,
  });
  const paid = await paidStats(startups.map((s) => s.id));
  for (const s of startups) {
    const p = paid.get(s.id) ?? { amount: 0, count: 0 };
    const { total, parts } = computeStartupScore({
      ...s,
      apiStatus: s.apiStatus,
      paidAmount: p.amount,
      paidCount: p.count,
      membersCount: s._count.members,
    });
    await prisma.startup.update({ where: { id: s.id }, data: { score: total, scoreData: { ...parts } } });
  }
  return startups.length;
}

export function computeUserScore(u: {
  projectScores: number[];
  paidCount: number;
  acceptedCollabs: number;
  openToCollab: boolean;
  bio: string | null;
  skills: string[];
  avatarUrl: string | null;
  contactUrl: string | null;
  githubLogin: string | null;
}): { total: number; parts: UserScoreParts } {
  const sorted = [...u.projectScores].sort((a, b) => b - a);
  const top = sorted[0] ?? 0;
  const rest = sorted.slice(1).reduce((a, b) => a + b, 0);
  const projects = top * 0.4 + rest * 0.1;
  const support = 2 * u.paidCount;
  const collab = 3 * u.acceptedCollabs + (u.openToCollab ? 3 : 0);
  const profile =
    (u.bio && u.bio.length >= 30 ? 3 : 0) +
    (u.skills.length >= 3 ? 3 : u.skills.length > 0 ? 1 : 0) +
    (u.avatarUrl ? 2 : 0) +
    (u.contactUrl ? 3 : 0) +
    (u.githubLogin ? 4 : 0);
  const parts: UserScoreParts = {
    projects: r1(Math.min(USER_SCORE_MAX.projects, projects)),
    support: r1(Math.min(USER_SCORE_MAX.support, support)),
    collab: r1(Math.min(USER_SCORE_MAX.collab, collab)),
    profile: r1(Math.min(USER_SCORE_MAX.profile, profile)),
  };
  return { total: Math.min(100, Math.round(Object.values(parts).reduce((a, b) => a + b, 0))), parts };
}

export async function recomputeUserScores(userIds?: string[]): Promise<number> {
  const users = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds } } : { memberships: { some: {} } },
    select: {
      id: true,
      bio: true,
      skills: true,
      avatarUrl: true,
      contactUrl: true,
      githubLogin: true,
      openToCollab: true,
      memberships: { select: { startup: { select: { id: true, score: true } } } },
    },
  });
  for (const u of users) {
    const startupIds = u.memberships.map((m) => m.startup.id);
    const [paidCount, acceptedCollabs] = await Promise.all([
      startupIds.length
        ? prisma.preOrder.count({ where: { status: "PAID", startupId: { in: startupIds } } })
        : Promise.resolve(0),
      prisma.collabRequest.count({
        where: {
          status: "ACCEPTED",
          OR: [{ fromUserId: u.id }, { toUserId: u.id }, ...(startupIds.length ? [{ toStartupId: { in: startupIds } }] : [])],
        },
      }),
    ]);
    const { total, parts } = computeUserScore({
      ...u,
      projectScores: u.memberships.map((m) => m.startup.score),
      paidCount,
      acceptedCollabs,
    });
    await prisma.user.update({ where: { id: u.id }, data: { score: total, scoreData: { ...parts } } });
  }
  return users.length;
}

/** Пересчитать проект и всех его участников. Ошибки не пробрасываем — рейтинг не должен ломать действие. */
export async function refreshScores(startupId: string): Promise<void> {
  try {
    await recomputeStartupScores([startupId]);
    const members = await prisma.startupMember.findMany({ where: { startupId }, select: { userId: true } });
    if (members.length) await recomputeUserScores(members.map((m) => m.userId));
  } catch (e) {
    console.warn("[score] recompute failed", e);
  }
}

export async function refreshUserScore(userId: string): Promise<void> {
  try {
    await recomputeUserScores([userId]);
  } catch (e) {
    console.warn("[score] user recompute failed", e);
  }
}

export { levelFor, type Level } from "./levels";
