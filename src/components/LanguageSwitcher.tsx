"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { GlobeIcon } from "./icons";

export function LanguageSwitcher() {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <details className="group relative">
      <summary
        className="btn-ghost cursor-pointer list-none gap-1.5 px-2.5 [&::-webkit-details-marker]:hidden"
        aria-label={d.nav.language}
      >
        <GlobeIcon className="h-4 w-4" />
        <span className="text-xs font-bold">{LOCALE_SHORT[locale]}</span>
      </summary>
      <div className="card absolute right-0 z-50 mt-2 w-40 p-1 shadow-card-hover">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            disabled={pending}
            onClick={(e) => {
              (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
              startTransition(async () => {
                await setLocale(l);
                router.refresh();
              });
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-surface-2",
              l === locale && "font-semibold text-accent",
            )}
          >
            {LOCALE_LABEL[l]}
            <span className="text-[11px] text-muted">{LOCALE_SHORT[l]}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
