"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

/** Поле с текстом и кнопкой «Скопировать» */
export function CopyField({ value, label }: { value: string; label?: string }) {
  const { d } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && <div className="mb-1 text-xs font-medium text-muted">{label}</div>}
      <div className="flex gap-2">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input h-9 flex-1 font-mono text-xs" />
        <button
          type="button"
          className="btn-secondary btn-sm shrink-0"
          onClick={async (e) => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement | null;
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              input?.select();
            }
          }}
        >
          {copied ? d.common.copied : d.common.copy}
        </button>
      </div>
    </div>
  );
}
