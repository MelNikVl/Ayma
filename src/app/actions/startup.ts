"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseStartupForm, type FormState, type StartupInput } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { uniqueSlug } from "@/lib/queries";
import { fetchRepoInfo, parseGithubUrl } from "@/lib/github";
import { env } from "@/lib/env";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { canManageStartup } from "@/lib/access";
import { refreshScores } from "@/lib/score";
import { Prisma } from "@prisma/client";

async function githubFields(githubUrl: string | null) {
  const ref = parseGithubUrl(githubUrl);
  if (!ref) return { githubStars: 0, githubLastCommit: null };
  const info = await fetchRepoInfo(ref, { fresh: true });
  return { githubStars: info?.stars ?? 0, githubLastCommit: info?.pushedAt ?? null };
}

function dataFromInput(input: StartupInput) {
  const { tagIds: _tagIds, roadmap, ...rest } = input;
  void _tagIds;
  return { ...rest, roadmap: roadmap.length ? (roadmap as Prisma.InputJsonValue) : Prisma.DbNull };
}

export async function createStartup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = parseStartupForm(formData);
  if (!parsed.success) {
    return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const recent = await prisma.startup.count({
    where: { founderId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recent >= 5 && user.role !== "ADMIN") {
    return { ok: false, message: "tooMany" };
  }

  const slug = await uniqueSlug(slugify(input.name));
  const status = env.autoApprove || user.role === "ADMIN" ? "APPROVED" : "PENDING";

  const startup = await prisma.startup.create({
    data: {
      ...dataFromInput(input),
      ...(await githubFields(input.githubUrl)),
      slug,
      status,
      founderId: user.id,
      tags: { connect: input.tagIds.map((id) => ({ id })) },
      members: { create: { userId: user.id, role: "OWNER" } },
    },
    select: { id: true, slug: true },
  });
  await refreshScores(startup.id);

  if (status === "PENDING") {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { telegramId: true } });
    await Promise.all(
      admins.map((a) =>
        sendTelegramMessage(
          a.telegramId,
          `🆕 Новый стартап на модерации: <b>${escapeHtml(input.name)}</b>\n${env.appUrl}/admin`,
        ),
      ),
    );
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect(`/startup/${startup.slug}?created=1`);
}

export async function updateStartup(
  startupId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const existing = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { founderId: true, githubUrl: true, status: true, slug: true },
  });
  if (!existing) return { ok: false, message: "notFound" };
  if (!(await canManageStartup(user, startupId))) {
    return { ok: false, message: "noRights" };
  }

  const parsed = parseStartupForm(formData);
  if (!parsed.success) {
    return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input = parsed.data;

  const github = input.githubUrl !== existing.githubUrl ? await githubFields(input.githubUrl) : {};

  // логотип и обложка меняются отдельной загрузкой — форма их не трогает, если полей нет
  const { logoUrl, coverUrl, ...rest } = dataFromInput(input);
  await prisma.startup.update({
    where: { id: startupId },
    data: {
      ...rest,
      ...(formData.has("logoUrl") ? { logoUrl } : {}),
      ...(formData.has("coverUrl") ? { coverUrl } : {}),
      ...github,
      // отклонённый стартап после правок снова уходит на модерацию
      status: existing.status === "REJECTED" ? "PENDING" : existing.status,
      tags: { set: input.tagIds.map((id) => ({ id })) },
    },
  });

  await refreshScores(startupId);
  revalidatePath("/");
  revalidatePath(`/startup/${existing.slug}`);
  revalidatePath("/dashboard");
  redirect(`/startup/${existing.slug}`);
}

export async function refreshGithub(startupId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { founderId: true, githubUrl: true, slug: true },
  });
  if (!startup || !(await canManageStartup(user, startupId))) return;

  await prisma.startup.update({ where: { id: startupId }, data: await githubFields(startup.githubUrl) });
  await refreshScores(startupId);
  revalidatePath(`/startup/${startup.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
}

