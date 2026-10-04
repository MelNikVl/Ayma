/**
 * Спонсорство в USDT через MetaMask. Общие для клиента и сервера константы и хелперы.
 * Перевод некастодиальный: USDT идёт с кошелька спонсора напрямую на кошелёк команды,
 * AYMA только проверяет транзакцию в блокчейне и показывает её на странице проекта.
 */

export type ChainConfig = {
  id: number;
  hex: string;
  name: string;
  short: string;
  rpcs: string[];
  explorer: string;
  native: { name: string; symbol: string; decimals: 18 };
  usdt: { address: string; decimals: number };
};

export const CHAINS: ChainConfig[] = [
  {
    id: 137,
    hex: "0x89",
    name: "Polygon",
    short: "Polygon",
    rpcs: ["https://polygon-bor-rpc.publicnode.com", "https://polygon.drpc.org"],
    explorer: "https://polygonscan.com",
    native: { name: "POL", symbol: "POL", decimals: 18 },
    usdt: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  },
  {
    id: 56,
    hex: "0x38",
    name: "BNB Smart Chain",
    short: "BSC",
    rpcs: ["https://bsc-dataseed.bnbchain.org", "https://bsc-rpc.publicnode.com"],
    explorer: "https://bscscan.com",
    native: { name: "BNB", symbol: "BNB", decimals: 18 },
    usdt: { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
  },
  {
    id: 8453,
    hex: "0x2105",
    name: "Base",
    short: "Base",
    rpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    explorer: "https://basescan.org",
    native: { name: "Ether", symbol: "ETH", decimals: 18 },
    usdt: { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6 },
  },
];

export const DONATION_PRESETS = [5, 10, 25, 50];
export const DONATION_MIN = 1;
export const DONATION_MAX = 100_000;

/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export function chainById(id: number): ChainConfig | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function isEvmAddress(v: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(v);
}

export function isTxHash(v: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(v);
}

export function shortAddress(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** "12.5" → 12500000n при decimals=6 (без float-ошибок) */
export function parseUnits(value: string, decimals: number): bigint {
  const v = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(v)) throw new Error("bad amount");
  const [int, frac = ""] = v.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(int ?? "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

/** Сырые единицы токена → центы (округление вниз) */
export function rawToCents(raw: bigint, decimals: number): number {
  const cents = decimals >= 2 ? raw / 10n ** BigInt(decimals - 2) : raw * 10n ** BigInt(2 - decimals);
  return Number(cents > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : cents);
}

/** calldata для ERC-20 transfer(to, amount) */
export function encodeTransfer(to: string, amount: bigint): string {
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amt = amount.toString(16).padStart(64, "0");
  return `0xa9059cbb${addr}${amt}`;
}

export function formatUsdt(cents: number): string {
  const v = cents / 100;
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT`;
}
