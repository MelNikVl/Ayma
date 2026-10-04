-- Спонсорство в USDT через MetaMask
CREATE TYPE "CryptoStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

ALTER TABLE "Startup" ADD COLUMN "walletAddress" TEXT;

CREATE TABLE "CryptoDonation" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT,
    "chainId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT NOT NULL,
    "amountRaw" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "status" "CryptoStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "CryptoDonation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CryptoDonation_txHash_key" ON "CryptoDonation"("txHash");
CREATE INDEX "CryptoDonation_startupId_status_idx" ON "CryptoDonation"("startupId", "status");

ALTER TABLE "CryptoDonation" ADD CONSTRAINT "CryptoDonation_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoDonation" ADD CONSTRAINT "CryptoDonation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
