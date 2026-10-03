-- CreateEnum
CREATE TYPE "ApiStatus" AS ENUM ('NONE', 'PLANNED', 'BETA', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" VARCHAR(300),
ADD COLUMN     "contactUrl" TEXT,
ADD COLUMN     "openToCollab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreData" JSONB,
ADD COLUMN     "skills" TEXT[];

-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "advantages" TEXT,
ADD COLUMN     "apiDocsUrl" TEXT,
ADD COLUMN     "apiStatus" "ApiStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "apiTypes" TEXT[],
ADD COLUMN     "collabNote" VARCHAR(500),
ADD COLUMN     "competitors" VARCHAR(500),
ADD COLUMN     "fundingNeed" INTEGER,
ADD COLUMN     "fundingNeedDesc" TEXT,
ADD COLUMN     "implDays" INTEGER,
ADD COLUMN     "implPrice" INTEGER,
ADD COLUMN     "openToCollab" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pageAccent" TEXT,
ADD COLUMN     "pageFont" TEXT NOT NULL DEFAULT 'sans',
ADD COLUMN     "pageLayout" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "pageTheme" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "roadmap" JSONB,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreData" JSONB,
ADD COLUMN     "votesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Vote" (
    "userId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("userId","startupId")
);

-- CreateTable
CREATE TABLE "CollabRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromStartupId" TEXT,
    "toStartupId" TEXT,
    "toUserId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "message" VARCHAR(1000) NOT NULL,
    "contact" VARCHAR(200),
    "status" "CollabStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vote_startupId_createdAt_idx" ON "Vote"("startupId", "createdAt");

-- CreateIndex
CREATE INDEX "CollabRequest_toStartupId_status_idx" ON "CollabRequest"("toStartupId", "status");

-- CreateIndex
CREATE INDEX "CollabRequest_toUserId_status_idx" ON "CollabRequest"("toUserId", "status");

-- CreateIndex
CREATE INDEX "CollabRequest_fromUserId_idx" ON "CollabRequest"("fromUserId");

-- CreateIndex
CREATE INDEX "Startup_score_idx" ON "Startup"("score");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_fromStartupId_fkey" FOREIGN KEY ("fromStartupId") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_toStartupId_fkey" FOREIGN KEY ("toStartupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

