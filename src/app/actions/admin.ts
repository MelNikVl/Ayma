"use server";

import { revalidatePath } from "next/cache";
import type { Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { env } from "@/lib/env";

export async function setStartupStatus(startupId: string, status: Status): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  const startup = await prisma.startup.update({
    where: { id: startupId },
    data: { status },
    select: { slug: true, name: true, founder: { select: { telegramId: true } } },
  });

  const text =
    status === "APPROVED"
      ? `🎉 Стартап <b>${escapeHtml(startup.name)}</b> опубликован!\n${env.appUrl}/startup/${startup.slug}`
      : status === "REJECTED"
        ? `⚠️ Стартап <b>${escapeHtml(startup.name)}</b> не прошёл модерацию. Отредактируйте карточку — она снова уйдёт на проверку.`
        : null;
  if (text) await sendTelegramMessage(startup.founder.telegramId, text);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/startup/${startup.slug}`);
}
