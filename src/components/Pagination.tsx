import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { fill } from "@/i18n/format";

export function Pagination({
  page,
  pages,
  params,
  basePath = "/",
}: {
  page: number;
  pages: number;
  params: Record<string, string | undefined>;
  basePath?: string;
}) {
  const { d } = getI18n();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-secondary">← {d.common.back}</Link>
      )}
      <span className="px-3 text-sm text-muted">{fill(d.common.page, { n: page, total: pages })}</span>
      {page < pages && (
        <Link href={href(page + 1)} className="btn-secondary">{d.common.next} →</Link>
      )}
    </nav>
  );
}
