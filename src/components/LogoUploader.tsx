"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StartupLogo } from "./StartupLogo";

export function LogoUploader({ startupId, name, logoUrl }: { startupId: string; name: string; logoUrl: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(logoUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(method: "POST" | "DELETE", body?: FormData) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/startups/${startupId}/logo`, { method, body });
      const json = (await res.json()) as { ok: boolean; message: string; logoUrl?: string | null };
      setNotice({ ok: json.ok, text: json.message });
      if (json.ok) {
        setCurrent(json.logoUrl ?? null);
        setPreview(null);
        setFile(null);
        router.refresh();
      }
    } catch {
      setNotice({ ok: false, text: "Не удалось загрузить файл. Проверьте соединение и попробуйте ещё раз." });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setNotice({ ok: false, text: "Выберите файл картинки" });
      return;
    }
    const fd = new FormData();
    fd.append("logo", file);
    void send("POST", fd);
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Логотип проекта</h2>
      <p className="mt-1 text-sm text-muted">Квадратная картинка PNG, JPG, WebP или GIF до 2 МБ. Лучше от 256×256.</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {preview ? (
          <img src={preview} alt="Предпросмотр" className="h-24 w-24 rounded-[22px] border border-border object-cover" />
        ) : (
          <StartupLogo name={name} logoUrl={current} size={96} />
        )}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-3">
          <input
            id="logo-file"
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-fg hover:file:bg-border"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary btn-sm">
              {busy ? "Загружаем…" : "Загрузить логотип"}
            </button>
            {current && (
              <button type="button" disabled={busy} onClick={() => void send("DELETE")} className="btn-ghost btn-sm text-danger">
                Удалить логотип
              </button>
            )}
          </div>
          {notice && (
            <p className={notice.ok ? "text-sm text-success" : "text-sm text-danger"} role="status">
              {notice.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
