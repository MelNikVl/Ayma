"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { collabSchema, type FormState } from "@/lib/validation";
import { isMember, notifyTeam } from "@/lib/access";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { displayName } from "@/lib/format";
import { env } from "@/lib/env";
import { refreshScores, refreshUserScore } from "@/lib/score";

function nullable(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Отправить предложение коллаборации проекту или разработчику. */
export async function createCollab(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = collabSchema.safeParse({
    toStartupId: nullable(formData.get("toStartupId")),
    toUserId: nullable(formData.get("toUserId")),
    fromStartupId: nullable(formData.get("fromStartupId")),
    kind: formData.get("kind") ?? "other",
    message: formData.get("message") ?? "",
    contact: formData.get("contact") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  if (v.toUserId === user.id) return { ok: false, message: "collabSelf" };
  if (v.toStartupId && (await isMember(user.id, v.toStartupId))) return { ok: false, message: "collabSelf" };
  // предлагать «от имени проекта» можно только от своего проекта
  const fromStartupId = v.fromStartupId && (await isMember(user.id, v.fromStartupId)) ? v.fromStartupId : null;

  const duplicate = await prisma.collabRequest.findFirst({
    where: {
      fromUserId: user.id,
      status: "PENDING",
      ...(v.toStartupId ? { toStartupId: v.toStartupId } : { toUserId: v.toUserId }),
    },
    select: { id: true },
  });
  if (duplicate) return { ok: false, message: "collabDuplicate" };

  const created = await prisma.collabRequest.create({
    data: {
      fromUserId: user.id,
      fromStartupId,
      toStartupId: v.toStartupId,
      toUserId: v.toUserId,
      kind: v.kind,
      message: v.message,
      contact: v.contact,
    },
    select: { toStartup: { select: { id: true, name: true, slug: true } }, toUser: { select: { telegramId: true } } },
  });

  const text = `🤝 ${escapeHtml(displayName(user))} предлагает коллаборацию${
    created.toStartup ? ` проекту <b>${escapeHtml(created.toStartup.name)}</b>` : ""
  }:\n«${escapeHtml(v.message.slice(0, 300))}»\n${env.appUrl}/dashboard`;
  if (created.toStartup) await notifyTeam(created.toStartup.id, text);
  if (created.toUser) await sendTelegramMessage(created.toUser.telegramId, text);

  if (created.toStartup) revalidatePath(`/startup/${created.toStartup.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "collabSentOk" };
}

/** Ответить на предложение (принять/отклонить) — получатель или участник команды проекта-получателя. */
export async function respondCollab(id: string, accept: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const req = await prisma.collabRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      toUserId: true,
      toStartupId: true,
      fromUserId: true,
      fromStartupId: true,
      fromUser: { select: { telegramId: true } },
      toStartup: { select: { name: true } },
    },
  });
  if (!req || req.status !== "PENDING") return;
  const allowed = req.toUserId === user.id || (req.toStartupId ? await isMember(user.id, req.toStartupId) : false);
  if (!allowed && user.role !== "ADMIN") return;

  await prisma.collabRequest.update({ where: { id }, data: { status: accept ? "ACCEPTED" : "DECLINED" } });
  await sendTelegramMessage(
    req.fromUser.telegramId,
    accept
      ? `✅ Ваше предложение коллаборации${req.toStartup ? ` проекту «${escapeHtml(req.toStartup.name)}»` : ""} приняли! Свяжитесь друг с другом: ${env.appUrl}/dashboard`
      : `Предложение коллаборации${req.toStartup ? ` проекту «${escapeHtml(req.toStartup.name)}»` : ""} отклонено.`,
  );

  if (accept) {
    if (req.toStartupId) await refreshScores(req.toStartupId);
    if (req.fromStartupId) await refreshScores(req.fromStartupId);
    await refreshUserScore(req.fromUserId);
    if (req.toUserId) await refreshUserScore(req.toUserId);
  }
  revalidatePath("/dashboard");
}
