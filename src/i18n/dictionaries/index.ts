import type { Locale } from "../config";
import ru, { type Dict } from "./ru";
import kk from "./kk";
import en from "./en";

export type { Dict };
export const dictionaries: Record<Locale, Dict> = { ru, kk, en };

/** Перевод ключа сообщения/ошибки с запасным вариантом */
export function tMsg(d: Dict, key: string | undefined): string {
  if (!key) return "";
  return key
    .split("|")
    .map((k) => d.msg[k] ?? d.errors[k] ?? k)
    .join(" ");
}

/** Название тега на языке интерфейса */
export function tTag(d: Dict, name: string): string {
  return d.tags[name] ?? name;
}
