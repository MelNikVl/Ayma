"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { addMember, canManageStartup, MAX_MEMBERS, notifyTeam } from "@/lib/access";
import { fetchContributorLogins, parseGithubUrl } from "@/lib/github";
import { displayName } from "@/lib/format";
import { escapeHtml } from "@/lib/telegram";
import { env } from "@/lib/env";
import { refreshScores } from "@/lib/score";

export type ClaimState = { ok: boolean; message?: string };

function revalidateStartup(slug: string) {
  revalidatePath(`/startup/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

/**
 * «Это мой проект». Если GitHub-логин пользователя есть среди контрибьюторов репозитория —
 * сразу добавляем в команду. Иначе создаём заявку, которую подтверждает команда или админ.
 */
export async function claimStartup(startupId: string, _prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { id: true, slug: true, name: true, githubUrl: true, _count: { select: { members: true } } },
  });
  if (!startup) return { ok: false, message: "notFound" };
  if (startup._count.members >= MAX_MEMBERS) {
    return { ok: false, message: "teamFull" };
  }

  const ref = parseGithubUrl(startup.githubUrl);
  if (user.githubLogin && ref) {
    const contributors = await fetchContributorLogins(ref);
    if (contributors?.includes(user.githubLogin.toLowerCase())) {
      const result = await addMember(startup.id, user.id);
      if (result === "full") return { ok: false, message: "teamFull" };
      await notifyTeam(
        startup.id,
        `👋 ${escapeHtml(displayName(user))} присоединился к проекту <b>${escapeHtml(startup.name)}</b> (подтверждено по GitHub).`,
        user.id,
      );
      await refreshScores(startup.id);
      revalidateStartup(startup.slug);
      return { ok: true, message: "claimedOk" };
    }
  }

  // Автоматически подтвердить не получилось — заявка на ручную проверку
  const message = String(formData.get("message") ?? "").trim().slice(0, 500) || null;
  await prisma.claimRequest.upsert({
    where: { startupId_userId: { startupId: startup.id, userId: user.id } },
    create: { startupId: startup.id, userId: user.id, message },
    update: { status: "PENDING", message },
  });
  await notifyTeam(
    startup.id,
    `🙋 ${escapeHtml(displayName(user))} просит доступ к проекту <b>${escapeHtml(startup.name)}</b>.\nПодтвердите в кабинете: ${env.appUrl}/dashboard`,
  );
  revalidateStartup(startup.slug);

  const why = !user.githubLogin ? "claimNoGithub" : !ref ? "claimNoRepo" : "claimNotFound";
  // ключи двух сообщений через «|» — интерфейс переведёт и склеит
  return { ok: true, message: `${why}|claimSent` };
}

async function loadClaimForReview(claimId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const claim = await prisma.claimRequest.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      status: true,
      userId: true,
      user: { select: { telegramId: true } },
      startup: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!claim || claim.status !== "PENDING") return null;
  if (!(await canManageStartup(user, claim.startup.id))) {
    // заявку на «ничейный» проект может рассмотреть только админ
    return null;
  }
  return claim;
}

export async function approveClaim(claimId: string): Promise<void> {
  const claim = await loadClaimForReview(claimId);
  if (!claim) return;
  const result = await addMember(claim.startup.id, claim.userId);
  await refreshScores(claim.startup.id);
  if (result === "added" || result === "exists") {
    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage(
      claim.user.telegramId,
      `✅ Вас добавили в команду проекта <b>${escapeHtml(claim.startup.name)}</b> на AYMA.\n${env.appUrl}/dashboard`,
    );
  }
  revalidateStartup(claim.startup.slug);
}

export async function rejectClaim(claimId: string): Promise<void> {
  const claim = await loadClaimForReview(claimId);
  if (!claim) return;
  await prisma.claimRequest.update({ where: { id: claim.id }, data: { status: "REJECTED" } });
  revalidateStartup(claim.startup.slug);
}

/** Владелец или админ удаляет участника; любой участник может выйти сам. */
export async function removeMember(memberId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const member = await prisma.startupMember.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, role: true, startupId: true, startup: { select: { slug: true } } },
  });
  if (!member) return;

  const self = member.userId === user.id;
  const actor = await prisma.startupMember.findUnique({
    where: { startupId_userId: { startupId: member.startupId, userId: user.id } },
    select: { role: true },
  });
  if (!self && actor?.role !== "OWNER" && user.role !== "ADMIN") return;

  await prisma.$transaction(async (tx) => {
    await tx.startupMember.delete({ where: { id: member.id } });
    if (member.role === "OWNER") {
      // владение переходит самому раннему из оставшихся
      const next = await tx.startupMember.findFirst({
        where: { startupId: member.startupId },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.startupMember.update({ where: { id: next.id }, data: { role: "OWNER" } });
        await tx.startup.update({ where: { id: member.startupId }, data: { founderId: next.userId } });
      }
    }
  });
  await refreshScores(member.startupId);
  revalidateStartup(member.startup.slug);
}
