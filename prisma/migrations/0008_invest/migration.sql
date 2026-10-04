-- Заявки инвесторов
-- CreateEnum
CREATE TYPE "InvestStatus" AS ENUM ('NEW', 'IN_TALKS', 'DECLINED');

-- CreateTable
CREATE TABLE "InvestInterest" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'equity',
    "contact" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000),
    "status" "InvestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestInterest_startupId_status_idx" ON "InvestInterest"("startupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvestInterest_startupId_userId_key" ON "InvestInterest"("startupId", "userId");

-- AddForeignKey
ALTER TABLE "InvestInterest" ADD CONSTRAINT "InvestInterest_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestInterest" ADD CONSTRAINT "InvestInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

