-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubId" INTEGER,
ADD COLUMN     "githubLogin" TEXT,
ALTER COLUMN "telegramId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "readme" TEXT,
ADD COLUMN     "repoMeta" JSONB;

-- CreateTable
CREATE TABLE "StartupMember" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRequest" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" VARCHAR(500),
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StartupMember_userId_idx" ON "StartupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StartupMember_startupId_userId_key" ON "StartupMember"("startupId", "userId");

-- CreateIndex
CREATE INDEX "ClaimRequest_status_idx" ON "ClaimRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRequest_startupId_userId_key" ON "ClaimRequest"("startupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- AddForeignKey
ALTER TABLE "StartupMember" ADD CONSTRAINT "StartupMember_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupMember" ADD CONSTRAINT "StartupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRequest" ADD CONSTRAINT "ClaimRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: автор каждого стартапа становится владельцем (кроме системных импортёров с telegramId < 0)
INSERT INTO "StartupMember" ("id", "startupId", "userId", "role")
SELECT 'mbr_' || md5(s."id"), s."id", s."founderId", 'OWNER'
FROM "Startup" s
JOIN "User" u ON u."id" = s."founderId"
WHERE u."telegramId" IS NULL OR u."telegramId" >= 0
ON CONFLICT DO NOTHING;
