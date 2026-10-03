import "server-only";
import { prisma } from "./prisma";
import type { SessionUser } from "./session";
import { sendTelegramMessage } from "./telegram";

/** Максимум разработчиков в команде одного проекта. */
export const MAX_MEMBERS = 3;

/** Может ли пользователь управлять карточкой стартапа (участник команды или админ). */
export async function canManageStartup(user: SessionUser | null, startupId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const member = await prisma.startupMember.findUnique({
    where: { startupId_userId: { startupId, userId: user.id } },
    select: { id: true },
  });
  return Boolean(member);
}

export async function isMember(userId: string, startupId: string): Promise<boolean> {
  const m = await prisma.startupMember.findUnique({
    where: { startupId_userId: { startupId, userId } },
    select: { id: true },
  });
  return Boolean(m);
}

/** Сообщение в Telegram всем участникам команды (у кого привязан Telegram). */
export async function notifyTeam(startupId: string, text: string, exceptUserId?: string): Promise<void> {
  const members = await prisma.startupMember.findMany({
    where: { startupId, ...(exceptUserId ? { userId: { not: exceptUserId } } : {}) },
    select: { user: { select: { telegramId: true } } },
  });
  await Promise.all(members.map((m) => sendTelegramMessage(m.user.telegramId, text)));
}

/** Добавить участника с учётом лимита. Первый участник становится владельцем и «фаундером» карточки. */
export async function addMember(startupId: string, userId: string): Promise<"added" | "exists" | "full"> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.startupMember.findUnique({
      where: { startupId_userId: { startupId, userId } },
      select: { id: true },
    });
    if (existing) return "exists" as const;
    const count = await tx.startupMember.count({ where: { startupId } });
    if (count >= MAX_MEMBERS) return "full" as const;
    await tx.startupMember.create({
      data: { startupId, userId, role: count === 0 ? "OWNER" : "MEMBER" },
    });
    if (count === 0) await tx.startup.update({ where: { id: startupId }, data: { founderId: userId } });
    await tx.claimRequest.updateMany({
      where: { startupId, userId, status: "PENDING" },
      data: { status: "APPROVED" },
    });
    return "added" as const;
  });
}
