"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isMember } from "@/lib/access";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { displayName } from "@/lib/format";
import { env } from "@/lib/env";
import { refreshUserScore } from "@/lib/score";
import { jobResponseSchema, jobSchema, type FormState } from "@/lib/validation";

const MAX_OPEN_JOBS = 5;
const MAX_RESPONSES_PER_DAY = 30;

function nullable(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Заказчик размещает задачу. */
export async function createJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = jobSchema.safeParse({
    title: str(formData, "title"),
    description: str(formData, "description"),
    categories: formData.getAll("categories").map(String),
    company: str(formData, "company"),
    budgetMin: str(formData, "budgetMin"),
    budgetMax: str(formData, "budgetMax"),
    deadlineDays: str(formData, "deadlineDays"),
    contact: str(formData, "contact"),
  });
  if (!parsed.success) return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };

  const open = await prisma.job.count({ where: { authorId: user.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
  if (open >= MAX_OPEN_JOBS) return { ok: false, message: "jobLimit" };

  const v = parsed.data;
  const job = await prisma.job.create({ data: { ...v, authorId: user.id }, select: { id: true } });
  if (v.company) await prisma.user.update({ where: { id: user.id }, data: { company: v.company } });

  revalidatePath("/jobs");
  revalidatePath("/business");
  redirect(`/jobs/${job.id}?created=1`);
}

/** Разработчик откликается на задачу. */
export async function respondToJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "loginRequired" };

  const parsed = jobResponseSchema.safeParse({
    jobId: str(formData, "jobId"),
    startupId: nullable(formData.get("startupId")),
    message: str(formData, "message"),
    price: str(formData, "price"),
    days: str(formData, "days"),
  });
  if (!parsed.success) return { ok: false, message: "checkForm", fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const job = await prisma.job.findUnique({
    where: { id: v.jobId },
    select: { id: true, title: true, status: true, hidden: true, authorId: true, author: { select: { telegramId: true } } },
  });
  if (!job || job.hidden) return { ok: false, message: "jobClosed" };
  if (job.authorId === user.id) return { ok: false, message: "jobSelf" };
  if (job.status !== "OPEN") return { ok: false, message: "jobClosed" };

  const [dup, today] = await Promise.all([
    prisma.jobResponse.findUnique({ where: { jobId_userId: { jobId: job.id, userId: user.id } }, select: { id: true } }),
    prisma.jobResponse.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
  ]);
  if (dup) return { ok: false, message: "jobDuplicate" };
  if (today >= MAX_RESPONSES_PER_DAY) return { ok: false, message: "jobRespLimit" };

  const startupId = v.startupId && (await isMember(user.id, v.startupId)) ? v.startupId : null;

  await prisma.$transaction([
    prisma.jobResponse.create({
      data: { jobId: job.id, userId: user.id, startupId, message: v.message, price: v.price, days: v.days },
    }),
    prisma.job.update({ where: { id: job.id }, data: { responsesCount: { increment: 1 } } }),
  ]);

  await sendTelegramMessage(
    job.author.telegramId,
    `📨 Новый отклик на «${escapeHtml(job.title)}» от ${escapeHtml(displayName(user))}${
      v.price ? ` — ${v.price.toLocaleString("ru-RU")} ₸` : ""
    }${v.days ? `, ${v.days} дн.` : ""}\n${env.appUrl}/jobs/${job.id}`,
  );

  revalidatePath(`/jobs/${job.id}`);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { ok: true, message: "jobRespOk" };
}

async function loadOwnedJob(jobId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true, authorId: true, status: true } });
  if (!job) return null;
  if (job.authorId !== user.id && user.role !== "ADMIN") return null;
  return { user, job };
}

/** Заказчик выбирает исполнителя или отклоняет отклик. */
export async function decideJobResponse(responseId: string, accept: boolean): Promise<void> {
  const resp = await prisma.jobResponse.findUnique({
    where: { id: responseId },
    select: { id: true, jobId: true, status: true, userId: true, user: { select: { telegramId: true } } },
  });
  if (!resp || resp.status !== "PENDING") return;
  const owned = await loadOwnedJob(resp.jobId);
  if (!owned || owned.job.status === "DONE" || owned.job.status === "CLOSED") return;

  await prisma.jobResponse.update({ where: { id: resp.id }, data: { status: accept ? "ACCEPTED" : "DECLINED" } });
  if (accept && owned.job.status === "OPEN") {
    await prisma.job.update({ where: { id: resp.jobId }, data: { status: "IN_PROGRESS" } });
  }
  await sendTelegramMessage(
    resp.user.telegramId,
    accept
      ? `✅ Вас выбрали исполнителем задачи «${escapeHtml(owned.job.title)}». Контакты заказчика открыты: ${env.appUrl}/jobs/${resp.jobId}`
      : `Заказчик выбрал другого исполнителя для «${escapeHtml(owned.job.title)}». Спасибо за отклик!`,
  );
  revalidatePath(`/jobs/${resp.jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

/** Смена статуса задачи автором: закрыть, завершить, открыть снова. */
export async function setJobStatus(jobId: string, status: "OPEN" | "DONE" | "CLOSED"): Promise<void> {
  const owned = await loadOwnedJob(jobId);
  if (!owned) return;
  await prisma.job.update({ where: { id: jobId }, data: { status } });
  if (status === "DONE") {
    const accepted = await prisma.jobResponse.findMany({ where: { jobId, status: "ACCEPTED" }, select: { userId: true } });
    for (const r of accepted) await refreshUserScore(r.userId);
  }
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

/** Разработчик отзывает свой отклик (пока его не рассмотрели). */
export async function withdrawJobResponse(responseId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const resp = await prisma.jobResponse.findUnique({ where: { id: responseId }, select: { userId: true, jobId: true, status: true } });
  if (!resp || resp.userId !== user.id || resp.status !== "PENDING") return;
  await prisma.$transaction([
    prisma.jobResponse.delete({ where: { id: responseId } }),
    prisma.job.update({ where: { id: resp.jobId }, data: { responsesCount: { decrement: 1 } } }),
  ]);
  revalidatePath(`/jobs/${resp.jobId}`);
  revalidatePath("/dashboard");
}

/** Модерация: скрыть/показать задачу (только админ). */
export async function toggleJobHidden(jobId: string): Promise<void> {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { hidden: true } });
  if (!job) return;
  await prisma.job.update({ where: { id: jobId }, data: { hidden: !job.hidden } });
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}
