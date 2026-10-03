import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiate, type Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

export const getLocale = cache((): Locale => {
  const fromCookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  try {
    return negotiate(headers().get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
});

export const getI18n = cache((): { locale: Locale; d: Dict } => {
  const locale = getLocale();
  return { locale, d: dictionaries[locale] };
});
