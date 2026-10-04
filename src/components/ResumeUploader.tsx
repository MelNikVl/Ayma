"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { tMsg } from "@/i18n/dictionaries";

/** Загрузка резюме PDF (до 5 МБ) в профиль разработчика */
export function ResumeUploader({ url, name }: { url: string | null; name: string | null }) {
  const { d } = useI18n();
  const t = d.resume;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ url: string | null; name: string | null }>({ url, name });

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/me/resume", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; message: string; url?: string; name?: string };
      if (!json.ok) setError(tMsg(d, json.message));
      else {
        setCurrent({ url: json.url ?? null, name: json.name ?? file.name });
        router.refresh();
      }
    } catch {
      setError(tMsg(d, "uploadFailed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    await fetch("/api/me/resume", { method: "DELETE" }).catch(() => null);
    setCurrent({ url: null, name: null });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-danger/10 text-xs font-black text-danger">PDF</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{t.title}</div>
          {current.url ? (
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-accent hover:underline">
              {current.name ?? "resume.pdf"}
            </a>
          ) : (
            <div className="text-xs text-muted">{t.hint}</div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={input}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            id="resume-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <label htmlFor="resume-file" className={"btn-secondary btn-sm cursor-pointer" + (busy ? " pointer-events-none opacity-60" : "")}>
            {busy ? d.common.saving : current.url ? t.replace : t.upload}
          </label>
          {current.url && (
            <button type="button" onClick={remove} disabled={busy} className="btn-secondary btn-sm text-danger">
              {t.remove}
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
