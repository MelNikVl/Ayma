"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isMember, notifyTeam } from "@/lib/access";
import { escapeHtml } from "@/lib/telegram";
import { displayName } from "@/lib/format";
import { env } from "@/lib/env";
import { investSchema, type FormState } from "@/lib/validation";

/** Инвестор оставляет (или обновляет) заявку о намерении инвестировать. */
export async function submitInvestInterest(startupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const startup = await prisma.startup.findUnique({ where: { id: startupId }, select: { id: true, slug: true, name: true, status: true } });
  if (!startup || startup.status !== "APPROVED") return { ok: false, message: "notFound" };
  if (await isMember(user.id, startup.id)) return { ok: false, message: "investOwn" };

  const parsed = investSchema.safeParse({
    amount: formData.get("amount") ?? "",
    format: formData.get("format") ?? "equity",
    contact: formData.get("contact") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const existing = await prisma.investInterest.findUnique({ where: { startupId_userId: { startupId, userId: user.id } }, select: { id: true } });
  await prisma.investInterest.upsert({
    where: { startupId_userId: { startupId, userId: user.id } },
    create: { startupId, userId: user.id, ...v },
    update: { ...v, status: "NEW" },
  });

  await notifyTeam(
    startup.id,
    `💰 ${escapeHtml(displayName(user))} ${existing ? "обновил(а) заявку" : "хочет инвестировать"} в «${escapeHtml(startup.name)}»: ${v.amount.toLocaleString("ru-RU")} ₸.\nКонтакты — в кабинете: ${env.appUrl}/dashboard#investors`,
  );

  revalidatePath(`/startup/${startup.slug}`);
  revalidatePath(`/startup/${startup.slug}/invest`);
  revalidatePath("/dashboard");
  return { ok: true, message: "investSent" };
}

/** Инвестор отзывает заявку. */
export async function withdrawInvestInterest(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const row = await prisma.investInterest.findUnique({ where: { id }, select: { userId: true, startup: { select: { slug: true } } } });
  if (!row || row.userId !== user.id) return;
  await prisma.investInterest.delete({ where: { id } });
  revalidatePath(`/startup/${row.startup.slug}`);
  revalidatePath("/dashboard");
}

/** Команда отмечает статус заявки: в переговорах / отклонена. */
export async function setInvestStatus(id: string, status: "IN_TALKS" | "DECLINED"): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const row = await prisma.investInterest.findUnique({ where: { id }, select: { startupId: true, startup: { select: { slug: true } } } });
  if (!row) return;
  if (!(await isMember(user.id, row.startupId)) && user.role !== "ADMIN") return;
  await prisma.investInterest.update({ where: { id }, data: { status } });
  revalidatePath(`/startup/${row.startup.slug}`);
  revalidatePath("/dashboard");
}
