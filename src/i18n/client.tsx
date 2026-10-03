"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";

const I18nContext = createContext<{ locale: Locale; d: Dict } | null>(null);

export function I18nProvider({ locale, d, children }: { locale: Locale; d: Dict; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, d }}>{children}</I18nContext.Provider>;
}

export function useI18n(): { locale: Locale; d: Dict } {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n: нет I18nProvider");
  return ctx;
}
