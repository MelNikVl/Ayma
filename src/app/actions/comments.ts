"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isMember, notifyTeam } from "@/lib/access";
import { escapeHtml } from "@/lib/telegram";
import { displayName } from "@/lib/format";
import { env } from "@/lib/env";
import type { FormState } from "@/lib/validation";
import { nextCommentAt } from "@/lib/comments";

/** Комментарий к проекту: не больше 1 в сутки на пользователя (команда проекта отвечает без лимита). */
export async function addComment(startupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 3 || text.length > 1000) return { ok: false, message: "checkForm", fieldErrors: { text: ["comment"] } };

  const startup = await prisma.startup.findUnique({ where: { id: startupId }, select: { id: true, slug: true, name: true, status: true } });
  if (!startup || startup.status !== "APPROVED") return { ok: false, message: "notFound" };
  if (await nextCommentAt(user.id, startup.id)) return { ok: false, message: "commentLimit" };

  await prisma.comment.create({ data: { startupId, userId: user.id, text } });
  await notifyTeam(
    startup.id,
    `💬 ${escapeHtml(displayName(user))} о «${escapeHtml(startup.name)}»: «${escapeHtml(text.slice(0, 200))}»\n${env.appUrl}/startup/${startup.slug}#comments`,
    user.id,
  );
  revalidatePath(`/startup/${startup.slug}`);
  return { ok: true, message: "commentOk" };
}

/** Удалить комментарий: автор или админ. */
export async function deleteComment(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const c = await prisma.comment.findUnique({ where: { id }, select: { userId: true, startup: { select: { slug: true } } } });
  if (!c || (c.userId !== user.id && user.role !== "ADMIN")) return;
  await prisma.comment.delete({ where: { id } });
  revalidatePath(`/startup/${c.startup.slug}`);
}
