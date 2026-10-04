"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { refreshScores } from "@/lib/score";
import { chainById, isEvmAddress, isTxHash } from "@/lib/crypto";
import { verifyUsdtTransfer } from "@/lib/crypto-verify";

export type DonationResult = {
  status: "PENDING" | "CONFIRMED" | "FAILED" | "ERROR";
  amountCents?: number;
  error?: string; // ключ словаря crypto.err.*
};

/**
 * Регистрирует перевод USDT, отправленный из MetaMask, после проверки в блокчейне.
 * Пока транзакция не попала в блок — возвращает PENDING (клиент повторяет запрос).
 */
export async function recordCryptoDonation(input: {
  startupId: string;
  chainId: number;
  txHash: string;
  message?: string;
}): Promise<DonationResult> {
  const txHash = String(input.txHash ?? "").toLowerCase();
  const chain = chainById(Number(input.chainId));
  if (!chain || !isTxHash(txHash)) return { status: "ERROR", error: "bad_tx" };

  const startup = await prisma.startup.findUnique({
    where: { id: String(input.startupId) },
    select: { id: true, slug: true, status: true, walletAddress: true },
  });
  if (!startup || startup.status !== "APPROVED" || !startup.walletAddress || !isEvmAddress(startup.walletAddress)) {
    return { status: "ERROR", error: "no_wallet" };
  }

  const existing = await prisma.cryptoDonation.findUnique({ where: { txHash } });
  if (existing) {
    if (existing.startupId !== startup.id) return { status: "ERROR", error: "bad_tx" };
    return { status: existing.status, amountCents: existing.amountCents };
  }

  // Сначала проверяем в блокчейне — в базу попадают только подтверждённые переводы
  const toAddress = startup.walletAddress.toLowerCase();
  let result;
  try {
    result = await verifyUsdtTransfer(chain.id, txHash, toAddress);
  } catch {
    return { status: "PENDING" };
  }
  if (result.status === "PENDING") return { status: "PENDING" };
  if (result.status === "FAILED") {
    return { status: "FAILED", error: result.reason === "no_transfer" ? "no_transfer" : "reverted" };
  }

  const user = await getCurrentUser();
  const message = input.message?.toString().trim().slice(0, 200) || null;
  try {
    await prisma.cryptoDonation.create({
      data: {
        startupId: startup.id,
        userId: user?.id ?? null,
        chainId: chain.id,
        txHash,
        toAddress,
        message,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        fromAddress: result.from,
        amountRaw: result.amountRaw,
        amountCents: result.amountCents,
      },
    });
  } catch {
    // гонка: тот же txHash уже записан параллельным запросом
  }
  await refreshScores(startup.id);
  revalidatePath(`/startup/${startup.slug}`);
  return { status: "CONFIRMED", amountCents: result.amountCents };
}
