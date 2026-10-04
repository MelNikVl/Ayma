"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordCryptoDonation } from "@/app/actions/crypto";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/format";
import { cn } from "@/lib/cn";
import {
  CHAINS,
  DONATION_MAX,
  DONATION_MIN,
  DONATION_PRESETS,
  chainById,
  encodeTransfer,
  formatUsdt,
  parseUnits,
  shortAddress,
  type ChainConfig,
} from "@/lib/crypto";

type Eip1193 = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193[];
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

type Phase = "idle" | "connecting" | "switching" | "confirm" | "mining" | "done" | "error";

/** Предпочитаем MetaMask, если в браузере несколько кошельков */
function getProvider(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = window.ethereum;
  if (!eth) return undefined;
  return eth.providers?.find((p) => p.isMetaMask) ?? eth;
}

function errCode(e: unknown): number | undefined {
  const c = (e as { code?: unknown })?.code;
  return typeof c === "number" ? c : undefined;
}

async function ensureChain(eth: Eip1193, chain: ChainConfig) {
  const current = String(await eth.request({ method: "eth_chainId" })).toLowerCase();
  if (current === chain.hex) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.hex }] });
  } catch (e) {
    if (errCode(e) !== 4902) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chain.hex,
          chainName: chain.name,
          nativeCurrency: chain.native,
          rpcUrls: chain.rpcs,
          blockExplorerUrls: [chain.explorer],
        },
      ],
    });
  }
}

async function usdtBalance(eth: Eip1193, chain: ChainConfig, owner: string): Promise<bigint> {
  const data = `0x70a08231${owner.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
  const res = String(await eth.request({ method: "eth_call", params: [{ to: chain.usdt.address, data }, "latest"] }));
  return res && res !== "0x" ? BigInt(res) : 0n;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CryptoSponsor({ startupId, wallet }: { startupId: string; wallet: string }) {
  const { d } = useI18n();
  const t = d.crypto;
  const router = useRouter();
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [chainId, setChainId] = useState(CHAINS[0]!.id);
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<{ hash: string; chainId: number } | null>(null);
  const [received, setReceived] = useState<number | null>(null);

  useEffect(() => {
    // MetaMask внедряет провайдер асинхронно — проверяем с небольшой задержкой
    const check = () => setHasProvider(Boolean(getProvider()));
    check();
    const id = setTimeout(check, 600);
    setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
    return () => clearTimeout(id);
  }, []);

  const chain = chainById(chainId) ?? CHAINS[0]!;
  const busy = phase === "connecting" || phase === "switching" || phase === "confirm" || phase === "mining";

  function fail(key: keyof typeof t.err, vars: Record<string, string> = {}) {
    setError(fill(t.err[key], vars));
    setPhase("error");
  }

  async function confirmOnServer(hash: string, cid: number) {
    setPhase("mining");
    setError(null);
    // ~3 минуты: сервер сам проверяет квитанцию в блокчейне
    for (let i = 0; i < 60; i++) {
      const res = await recordCryptoDonation({ startupId, chainId: cid, txHash: hash, message });
      if (res.status === "CONFIRMED") {
        setReceived(res.amountCents ?? null);
        setPhase("done");
        router.refresh();
        return;
      }
      if (res.status === "FAILED" || res.status === "ERROR") {
        fail((res.error as keyof typeof t.err) ?? "bad_tx");
        return;
      }
      await sleep(3000);
    }
    fail("timeout");
  }

  async function send() {
    const eth = getProvider();
    if (!eth) return;
    setError(null);

    let raw: bigint;
    try {
      raw = parseUnits(amount, chain.usdt.decimals);
    } catch {
      return fail("amount");
    }
    const num = Number(amount.replace(",", "."));
    if (!(num >= DONATION_MIN && num <= DONATION_MAX)) return fail("amount");

    try {
      setPhase("connecting");
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const from = accounts[0];
      if (!from) return fail("rejected");

      setPhase("switching");
      await ensureChain(eth, chain);

      const balance = await usdtBalance(eth, chain, from).catch(() => null);
      if (balance !== null && balance < raw) return fail("balance", { chain: chain.short });

      setPhase("confirm");
      const hash = String(
        await eth.request({
          method: "eth_sendTransaction",
          params: [{ from, to: chain.usdt.address, data: encodeTransfer(wallet, raw), value: "0x0" }],
        }),
      );
      setTx({ hash, chainId: chain.id });
      await confirmOnServer(hash, chain.id);
    } catch (e) {
      if (errCode(e) === 4001) return fail("rejected");
      const msg = (e as { message?: string })?.message ?? String(e);
      fail("generic", { msg: msg.slice(0, 160) });
    }
  }

  const status =
    phase === "connecting" ? t.connecting
    : phase === "switching" ? t.switching
    : phase === "confirm" ? t.confirm
    : phase === "mining" ? t.mining
    : null;

  const txChain = tx ? chainById(tx.chainId) : undefined;
  const txLink = tx && txChain ? `${txChain.explorer}/tx/${tx.hash}` : null;

  if (phase === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-xl text-success">✓</div>
        <p className="mt-3 font-semibold">{fill(t.done, { amount: received !== null ? formatUsdt(received) : `${amount} USDT` })}</p>
        {txLink && (
          <a href={txLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-accent hover:underline">
            {t.viewTx} ↗
          </a>
        )}
        <button
          type="button"
          className="btn-secondary mt-4 w-full"
          onClick={() => {
            setPhase("idle");
            setTx(null);
            setReceived(null);
          }}
        >
          {t.again}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="label">{t.network}</span>
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t.network}>
          {CHAINS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={c.id === chainId}
              disabled={busy}
              onClick={() => setChainId(c.id)}
              className={cn(
                "rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                c.id === chainId ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-fg/30",
              )}
            >
              {c.short}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="usdt-amount" className="label">{t.amount}</label>
        <div className="flex flex-wrap gap-1.5">
          {DONATION_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => setAmount(String(p))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                amount === String(p) ? "border-fg bg-fg text-bg" : "border-border hover:border-fg/30",
              )}
            >
              ${p}
            </button>
          ))}
          <input
            id="usdt-amount"
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))}
            className="input w-24 flex-1 py-1.5 tabular-nums"
          />
        </div>
      </div>

      <div>
        <label htmlFor="usdt-msg" className="label">{t.message}</label>
        <input id="usdt-msg" value={message} maxLength={200} disabled={busy} onChange={(e) => setMessage(e.target.value)} className="input" />
      </div>

      {hasProvider === false ? (
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          <p className="text-muted">{t.noWallet}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {isMobile && (
              <a
                className="btn-primary btn-sm"
                href={`https://metamask.app.link/dapp/${typeof window !== "undefined" ? window.location.host + window.location.pathname : ""}`}
              >
                {t.openInApp}
              </a>
            )}
            <a className="btn-secondary btn-sm" href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
              {t.install} ↗
            </a>
          </div>
        </div>
      ) : (
        <button type="button" onClick={send} disabled={busy || hasProvider === null} className="btn-primary w-full py-3">
          <WalletIcon className="h-5 w-5" />
          {busy ? status : fill(t.send, { amount: amount || "0" })}
        </button>
      )}

      {phase === "mining" && txLink && (
        <a href={txLink} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-accent hover:underline">
          {t.viewTx} ↗
        </a>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
          {tx && (
            <button type="button" onClick={() => confirmOnServer(tx.hash, tx.chainId)} className="ml-2 font-semibold underline">
              {t.retry}
            </button>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        {fill(t.note, { wallet: shortAddress(wallet) })} {fill(t.fee, { native: chain.native.symbol })}
      </p>
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3m0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M21 12h-4a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  );
}
