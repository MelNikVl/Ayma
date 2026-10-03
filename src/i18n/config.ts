export const LOCALES = ["ru", "kk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "ayma_locale";

export const INTL_TAG: Record<Locale, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
export const LOCALE_LABEL: Record<Locale, string> = { ru: "Русский", kk: "Қазақша", en: "English" };
export const LOCALE_SHORT: Record<Locale, string> = { ru: "RU", kk: "KZ", en: "EN" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Выбор языка из заголовка Accept-Language */
export function negotiate(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: (tag ?? "").toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of prefs) {
    if (tag.startsWith("kk") || tag.startsWith("kz")) return "kk";
    if (tag.startsWith("ru")) return "ru";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}
