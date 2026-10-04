-- Биржа задач: заказы компаний и отклики разработчиков
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobResponseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "company" VARCHAR(80);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "categories" TEXT[],
    "company" VARCHAR(80),
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "deadlineDays" INTEGER,
    "contact" VARCHAR(200),
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "responsesCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobResponse" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startupId" TEXT,
    "message" TEXT NOT NULL,
    "price" INTEGER,
    "days" INTEGER,
    "status" "JobResponseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_authorId_idx" ON "Job"("authorId");

-- CreateIndex
CREATE INDEX "JobResponse_userId_idx" ON "JobResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobResponse_jobId_userId_key" ON "JobResponse"("jobId", "userId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResponse" ADD CONSTRAINT "JobResponse_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResponse" ADD CONSTRAINT "JobResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResponse" ADD CONSTRAINT "JobResponse_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

