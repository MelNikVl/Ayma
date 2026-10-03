"use client";

import { useI18n } from "@/i18n/client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { d } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-xl font-bold">{d.error.title}</h1>
      <p className="mt-2 text-sm text-muted">{d.error.text}</p>
      <button onClick={reset} className="btn-primary mt-6">{d.error.retry}</button>
    </div>
  );
}
