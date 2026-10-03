"use client";

import { useI18n } from "@/i18n/client";
import { tMsg } from "@/i18n/dictionaries";

/** Сообщение формы: ключ словаря → текст на языке пользователя */
export function FormMessage({ ok, message }: { ok: boolean; message?: string }) {
  const { d } = useI18n();
  if (!message) return null;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={
        ok
          ? "rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm"
          : "rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
      }
    >
      {tMsg(d, message)}
    </div>
  );
}
