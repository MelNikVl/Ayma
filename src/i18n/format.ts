import { INTL_TAG, type Locale } from "./config";

/** 5000 → «5 000 ₸» */
export function formatPrice(value: number, locale: Locale = "ru"): string {
  return `${new Intl.NumberFormat(INTL_TAG[locale], { maximumFractionDigits: 0 }).format(value)} ₸`;
}

/** 1234 → «1.2k» */
export function formatCompact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatNumber(value: number, locale: Locale = "ru"): string {
  return new Intl.NumberFormat(INTL_TAG[locale]).format(value);
}

const JUST_NOW: Record<Locale, string> = { ru: "только что", kk: "жаңа ғана", en: "just now" };

/** Дата → «2 дня назад» / «2 күн бұрын» / «2 days ago» */
export function formatRelative(date: Date | string, locale: Locale = "ru", now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return JUST_NOW[locale];
  const rtf = new Intl.RelativeTimeFormat(INTL_TAG[locale], { numeric: "auto" });
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
  return JUST_NOW[locale];
}

export function formatDate(date: Date, locale: Locale = "ru"): string {
  return date.toLocaleDateString(INTL_TAG[locale], { day: "numeric", month: "long", year: "numeric" });
}

/** Формы слова для числа: { one, few?, many?, other } — правила Intl.PluralRules */
export type PluralForms = { one: string; few?: string; many?: string; other: string };
export function plural(n: number, forms: PluralForms, locale: Locale = "ru"): string {
  const rule = new Intl.PluralRules(INTL_TAG[locale]).select(n) as keyof PluralForms;
  return forms[rule] ?? forms.other;
}

/** Подстановка {name} в строку */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 50 000 000 → «50 млн ₸» / «50M ₸» — для бейджей и кнопок */
export function formatMoneyShort(value: number, locale: Locale = "ru"): string {
  return `${new Intl.NumberFormat(INTL_TAG[locale], { notation: "compact", maximumFractionDigits: 1 }).format(value)} ₸`;
}
