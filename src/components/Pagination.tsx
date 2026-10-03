import Link from "next/link";

export function Pagination({
  page,
  pages,
  params,
}: {
  page: number;
  pages: number;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Страницы">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-secondary">
          ← Назад
        </Link>
      )}
      <span className="px-3 text-sm text-muted">
        {page} из {pages}
      </span>
      {page < pages && (
        <Link href={href(page + 1)} className="btn-secondary">
          Дальше →
        </Link>
      )}
    </nav>
  );
}
