import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="text-6xl font-black text-accent">404</div>
      <h1 className="mt-4 text-xl font-bold">Страница не найдена</h1>
      <p className="mt-2 text-sm text-muted">Возможно, стартап ещё на модерации или был удалён.</p>
      <Link href="/" className="btn-primary mt-6">На главную</Link>
    </div>
  );
}
