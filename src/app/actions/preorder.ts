"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { preOrderSchema, type FormState } from "@/lib/validation";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { formatPrice, displayName } from "@/lib/format";
import { env } from "@/lib/env";
import { canManageStartup, isMember, notifyTeam } from "@/lib/access";
import { refreshScores } from "@/lib/score";

export async function createPreOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = preOrderSchema.safeParse({
    startupId: formData.get("startupId"),
    quantity: formData.get("quantity") ?? 1,
    contactInfo: formData.get("contactInfo") ?? "",
    agree: formData.get("agree") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { startupId, quantity, contactInfo } = parsed.data;

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      founderId: true,
      preOrderEnabled: true,
      preOrderPrice: true,
      paymentUrl: true,
    },
  });
  if (!startup || startup.status !== "APPROVED" || !startup.preOrderEnabled || startup.preOrderPrice <= 0) {
    return { ok: false, message: "preorderUnavailable" };
  }
  if (await isMember(user.id, startup.id)) {
    return { ok: false, message: "preorderOwn" };
  }

  const pending = await prisma.preOrder.count({
    where: { startupId, sponsorId: user.id, status: "PENDING" },
  });
  if (pending >= 3) {
    return { ok: false, message: "preorderPendingLimit" };
  }

  const amount = startup.preOrderPrice * quantity;
  const order = await prisma.preOrder.create({
    data: {
      startupId,
      sponsorId: user.id,
      quantity,
      amount,
      contactInfo,
      paymentLink: startup.paymentUrl,
    },
    select: { id: true },
  });

  await notifyTeam(
    startup.id,
    [
      `💸 Новый предзаказ: <b>${escapeHtml(startup.name)}</b>`,
      `Спонсор: ${escapeHtml(displayName(user))}`,
      `Сумма: ${formatPrice(amount)} (${quantity} шт.)`,
      `Контакт: ${escapeHtml(contactInfo)}`,
      `Подтвердите оплату в кабинете: ${env.appUrl}/dashboard`,
    ].join("\n"),
  );

  revalidatePath("/dashboard");
  redirect(`/startup/${startup.slug}/sponsor?order=${order.id}`);
}

/** Фаундер (или админ) меняет статус оплаты предзаказа. */
export async function setPreOrderStatus(preOrderId: string, status: PaymentStatus): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const order = await prisma.preOrder.findUnique({
    where: { id: preOrderId },
    select: {
      status: true,
      amount: true,
      startupId: true,
      startup: { select: { slug: true, name: true } },
      sponsor: { select: { telegramId: true } },
    },
  });
  if (!order) return;
  if (!(await canManageStartup(user, order.startupId))) return;
  if (order.status === status) return;

  await prisma.preOrder.update({ where: { id: preOrderId }, data: { status } });
  if (order.status === "PAID" || status === "PAID") await refreshScores(order.startupId);

  if (status === "PAID") {
    await sendTelegramMessage(
      order.sponsor.telegramId,
      `✅ Оплата предзаказа <b>${escapeHtml(order.startup.name)}</b> на ${formatPrice(order.amount)} подтверждена. Спасибо за поддержку!`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/startup/${order.startup.slug}`);
}

/** Спонсор отменяет свой неоплаченный предзаказ. */
export async function cancelMyPreOrder(preOrderId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.preOrder.updateMany({
    where: { id: preOrderId, sponsorId: user.id, status: "PENDING" },
    data: { status: "CANCELED" },
  });
  revalidatePath("/dashboard");
}
