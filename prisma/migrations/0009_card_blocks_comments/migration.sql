-- Новые блоки карточки, демо-проекты, комментарии
-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "buildMonths" INTEGER,
ADD COLUMN     "compensation" TEXT,
ADD COLUMN     "fundingBreakdown" JSONB,
ADD COLUMN     "fundingContact" VARCHAR(200),
ADD COLUMN     "hiring" TEXT,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "killerFeatures" TEXT,
ADD COLUMN     "secretSauce" TEXT,
ADD COLUMN     "teamInfo" TEXT;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_startupId_createdAt_idx" ON "Comment"("startupId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

