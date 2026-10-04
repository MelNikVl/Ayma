import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { JOB_CATEGORIES } from "./validation";

export const JOBS_PAGE_SIZE = 20;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const jobCardSelect = {
  id: true,
  title: true,
  description: true,
  categories: true,
  company: true,
  budgetMin: true,
  budgetMax: true,
  deadlineDays: true,
  status: true,
  responsesCount: true,
  createdAt: true,
  author: { select: { firstName: true, username: true, avatarUrl: true, company: true } },
} satisfies Prisma.JobSelect;

export type JobCardData = Prisma.JobGetPayload<{ select: typeof jobCardSelect }>;

export async function listJobs(opts: { cat?: string; all?: boolean; page?: number }) {
  const where: Prisma.JobWhereInput = {
    hidden: false,
    ...(opts.all ? {} : { status: "OPEN" }),
    ...(opts.cat && (JOB_CATEGORIES as readonly string[]).includes(opts.cat) ? { categories: { has: opts.cat } } : {}),
  };
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: JOBS_PAGE_SIZE,
      skip: (page - 1) * JOBS_PAGE_SIZE,
      select: jobCardSelect,
    }),
    prisma.job.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / JOBS_PAGE_SIZE)) };
}

export async function latestJobs(take = 3) {
  return prisma.job.findMany({
    where: { hidden: false, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take,
    select: jobCardSelect,
  });
}

export async function openJobsCount() {
  return prisma.job.count({ where: { hidden: false, status: "OPEN" } });
}

export async function getJob(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, username: true, avatarUrl: true, company: true, telegramId: true, githubLogin: true } },
      responses: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              username: true,
              avatarUrl: true,
              githubLogin: true,
              telegramId: true,
              score: true,
              bio: true,
              skills: true,
              contactUrl: true,
              linkedinUrl: true,
              resumeUrl: true,
            },
          },
          startup: { select: { id: true, slug: true, name: true, logoUrl: true, score: true } },
        },
      },
    },
  });
}

export async function myJobs(userId: string) {
  return prisma.job.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, take: 30, select: jobCardSelect });
}

export async function myJobResponses(userId: string) {
  return prisma.jobResponse.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, status: true, price: true, days: true, createdAt: true, job: { select: { id: true, title: true, status: true } } },
  });
}
