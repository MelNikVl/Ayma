-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" VARCHAR(300) NOT NULL,
    "referrer" VARCHAR(200),
    "utmSource" VARCHAR(100),
    "utmMedium" VARCHAR(100),
    "utmCampaign" VARCHAR(100),
    "visitor" VARCHAR(32) NOT NULL,
    "locale" VARCHAR(5),
    "device" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

