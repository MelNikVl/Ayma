import "server-only";
import { prisma } from "./prisma";
import { env } from "./env";

export const GITHUB_STATE_COOKIE = "aim_gh_state";

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export async function upsertTelegramUser(data: {
  id: string;
  username?: string;
  firstName?: string;
  avatarUrl?: string;
}) {
  const telegramId = BigInt(data.id);
  const isAdmin = env.adminTelegramIds.has(data.id);
  return prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: data.username ?? null,
      firstName: data.firstName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      role: isAdmin ? "ADMIN" : "FOUNDER",
    },
    update: {
      username: data.username ?? null,
      // имя пользователь мог поменять в профиле — не перезаписываем его при каждом входе
      avatarUrl: data.avatarUrl ?? null,
      ...(isAdmin ? { role: "ADMIN" as const } : {}),
    },
    select: { id: true },
  });
}

export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

/**
 * Вход через GitHub: находит пользователя по githubId или создаёт нового.
 * Если передан currentUserId (пользователь уже вошёл, например через Telegram) —
 * привязывает GitHub к этому аккаунту. Возвращает id пользователя или ошибку.
 */
export async function upsertGithubUser(
  gh: GithubProfile,
  currentUserId: string | null,
): Promise<{ id: string } | { error: "github_taken" }> {
  const isAdmin = env.adminGithubLogins.has(gh.login.toLowerCase());
  const existing = await prisma.user.findUnique({ where: { githubId: gh.id }, select: { id: true } });

  if (currentUserId) {
    if (existing && existing.id !== currentUserId) return { error: "github_taken" };
    const user = await prisma.user.update({
      where: { id: currentUserId },
      data: { githubId: gh.id, githubLogin: gh.login, ...(isAdmin ? { role: "ADMIN" as const } : {}) },
      select: { id: true, avatarUrl: true },
    });
    if (!user.avatarUrl && gh.avatar_url) {
      await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: gh.avatar_url } });
    }
    return { id: user.id };
  }

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { githubLogin: gh.login, ...(isAdmin ? { role: "ADMIN" as const } : {}) },
      select: { id: true },
    });
  }

  return prisma.user.create({
    data: {
      githubId: gh.id,
      githubLogin: gh.login,
      username: gh.login,
      firstName: gh.name ?? gh.login,
      avatarUrl: gh.avatar_url,
      role: isAdmin ? "ADMIN" : "FOUNDER",
    },
    select: { id: true },
  });
}
