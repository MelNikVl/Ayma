"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/client";

/** Отправляет просмотр страницы при каждой смене маршрута (sendBeacon, без cookies) */
export function Analytics() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { locale } = useI18n();

  useEffect(() => {
    const payload = JSON.stringify({
      p: pathname,
      r: document.referrer,
      us: params.get("utm_source"),
      um: params.get("utm_medium"),
      uc: params.get("utm_campaign"),
      l: locale,
    });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/a", blob)) {
        void fetch("/api/a", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      /* аналитика не должна ломать страницу */
    }
  }, [pathname, params, locale]);

  return null;
}
