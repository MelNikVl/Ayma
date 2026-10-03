const priceFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 5000 → «5 000 ₸» */
export function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} ₸`;
}

/** 1234 → «1.2k», 999 → «999» */
export function formatCompact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

/** Дата → «2 дня назад», «вчера», «только что» */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "только что";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (abs >= seconds) return rtf.format(Math.round(diffSec / seconds), unit);
  }
  return "только что";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Русская плюрализация: plural(3, ["спонсор", "спонсора", "спонсоров"]) */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function displayName(user: { username: string | null; firstName: string | null }): string {
  if (user.username) return `@${user.username}`;
  return user.firstName ?? "Аноним";
}
