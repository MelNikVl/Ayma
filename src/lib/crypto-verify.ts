import "server-only";
import { chainById, rawToCents, TRANSFER_TOPIC } from "./crypto";

type Receipt = {
  status: string;
  blockNumber: string;
  logs: { address: string; topics: string[]; data: string }[];
};

/** Пробует RPC по очереди — публичные узлы иногда отвечают 403/429 */
async function rpcAny<T>(urls: string[], method: string, params: unknown[]): Promise<T | null> {
  let lastErr: unknown;
  for (const url of urls) {
    try {
      return await rpc<T>(url, method, params);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result ?? null;
}

export type VerifyResult =
  | { status: "PENDING" }
  | { status: "FAILED"; reason: string }
  | { status: "CONFIRMED"; from: string; amountRaw: string; amountCents: number };

/**
 * Проверяет в блокчейне, что транзакция успешна и содержит перевод USDT
 * (официальный контракт этой сети) на кошелёк команды. Суммирует все такие переводы в транзакции.
 */
export async function verifyUsdtTransfer(chainId: number, txHash: string, expectedTo: string): Promise<VerifyResult> {
  const chain = chainById(chainId);
  if (!chain) return { status: "FAILED", reason: "chain" };
  const receipt = await rpcAny<Receipt>(chain.rpcs, "eth_getTransactionReceipt", [txHash]);
  if (!receipt) return { status: "PENDING" };
  if (receipt.status !== "0x1") return { status: "FAILED", reason: "reverted" };

  const token = chain.usdt.address.toLowerCase();
  const to = expectedTo.toLowerCase().replace(/^0x/, "");
  let total = 0n;
  let from = "";
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (!log.topics[2]?.toLowerCase().endsWith(to)) continue;
    total += BigInt(log.data);
    from = `0x${(log.topics[1] ?? "").slice(-40)}`;
  }
  if (total === 0n) return { status: "FAILED", reason: "no_transfer" };
  return { status: "CONFIRMED", from, amountRaw: total.toString(), amountCents: rawToCents(total, chain.usdt.decimals) };
}
