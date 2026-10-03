import "server-only";
import { prisma } from "./prisma";
import { env } from "./env";

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
      firstName: data.firstName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      ...(isAdmin ? { role: "ADMIN" as const } : {}),
    },
    select: { id: true },
  });
}
