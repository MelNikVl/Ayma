import "server-only";
import { prisma } from "./prisma";
import { isMember } from "./access";

export const COMMENT_WINDOW_MS = 24 * 3600 * 1000;

/** Время, когда пользователь сможет оставить следующий комментарий (null — уже можно). Команда у себя — без лимита. */
export async function nextCommentAt(userId: string, startupId: string): Promise<Date | null> {
  if (await isMember(userId, startupId)) return null;
  const last = await prisma.comment.findFirst({
    where: { userId, createdAt: { gte: new Date(Date.now() - COMMENT_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last ? new Date(last.createdAt.getTime() + COMMENT_WINDOW_MS) : null;
}

