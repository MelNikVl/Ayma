"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-xl font-bold">Что-то пошло не так</h1>
      <p className="mt-2 text-sm text-muted">Попробуйте обновить страницу.</p>
      <button onClick={reset} className="btn-primary mt-6">Повторить</button>
    </div>
  );
}
