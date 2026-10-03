"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { tMsg } from "@/i18n/dictionaries";
import { StartupLogo } from "./StartupLogo";

function Uploader({
  startupId,
  kind,
  name,
  initial,
}: {
  startupId: string;
  kind: "logo" | "cover";
  name: string;
  initial: string | null;
}) {
  const { d } = useI18n();
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(initial);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; key: string } | null>(null);

  async function send(method: "POST" | "DELETE", body?: FormData) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/startups/${startupId}/image?kind=${kind}`, { method, body });
      const json = (await res.json()) as { ok: boolean; message: string; url?: string | null };
      setNotice({ ok: json.ok, key: json.message });
      if (json.ok) {
        setCurrent(json.url ?? null);
        setPreview(null);
        setFile(null);
        router.refresh();
      }
    } catch {
      setNotice({ ok: false, key: "uploadFailed" });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setNotice({ ok: false, key: "fileMissing" });
    const fd = new FormData();
    fd.append("file", file);
    void send("POST", fd);
  }

  const shown = preview ?? current;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {kind === "logo" ? (
        preview ? (
          <img src={preview} alt="" className="h-20 w-20 rounded-[18px] border border-border object-cover" />
        ) : (
          <StartupLogo name={name} logoUrl={current} size={80} />
        )
      ) : (
        <div
          className="h-20 w-full shrink-0 rounded-xl border border-border bg-surface-2 bg-cover bg-center sm:w-56"
          style={shown ? { backgroundImage: `url(${shown})` } : undefined}
        />
      )}
      <form onSubmit={onSubmit} className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-sm font-semibold">{kind === "logo" ? d.logo.logo : d.logo.cover}</div>
        <p className="text-xs text-muted">{kind === "logo" ? d.logo.logoText : d.logo.coverText}</p>
        <input
          id={`${kind}-file`}
          type="file"
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
            {busy ? d.logo.uploading : d.logo.upload}
          </button>
          {current && (
            <button type="button" disabled={busy} onClick={() => void send("DELETE")} className="btn-ghost btn-sm text-danger">
              {d.logo.remove}
            </button>
          )}
        </div>
        {notice && (
          <p className={notice.ok ? "text-sm text-success" : "text-sm text-danger"} role="status">
            {tMsg(d, notice.key)}
          </p>
        )}
      </form>
    </div>
  );
}

export function ImageUploader({
  startupId,
  name,
  logoUrl,
  coverUrl,
}: {
  startupId: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
}) {
  const { d } = useI18n();
  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <h2 className="text-lg font-bold">{d.logo.title}</h2>
      <Uploader startupId={startupId} kind="logo" name={name} initial={logoUrl} />
      <div className="h-px bg-border/60" />
      <Uploader startupId={startupId} kind="cover" name={name} initial={coverUrl} />
    </section>
  );
}
