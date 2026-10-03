import Link from "next/link";
import { listStartups, listCatalogTags, type SortKey } from "@/lib/queries";
import { StartupCard } from "@/components/StartupCard";
import { TagFilter } from "@/components/TagFilter";
import { SortTabs } from "@/components/SortTabs";
import { Pagination } from "@/components/Pagination";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; tag?: string; sort?: string; page?: string };

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() ? s.trim().slice(0, 100) : undefined;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const q = one(searchParams.q);
  const tag = one(searchParams.tag);
  const sortRaw = one(searchParams.sort);
  const sort: SortKey = sortRaw === "new" || sortRaw === "stars" ? sortRaw : "popular";
  const page = Number(one(searchParams.page)) || 1;

  const [tags, result] = await Promise.all([listCatalogTags(), listStartups({ q, tag, sort, page })]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6">
      <TagFilter tags={tags} active={tag} q={q} sort={sort === "popular" ? undefined : sort} />

      <div className="mb-5 mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {q ? <>Результаты по «{q}»</> : tag ? tag : "ИИ-стартапы"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {result.total} {plural(result.total, ["проект", "проекта", "проектов"])} · поддержите предзаказом услуги
          </p>
        </div>
        <SortTabs current={sort} q={q} tag={tag} />
      </div>

      {result.items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <div className="text-4xl">🔍</div>
          <h2 className="mt-3 text-lg font-semibold">Ничего не нашли</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Попробуйте другой запрос или сбросьте фильтры. А может, это ваш шанс — добавьте свой стартап первым.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href="/" className="btn-secondary">Сбросить</Link>
            <Link href="/startup/new" className="btn-primary">Добавить стартап</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((s) => (
            <StartupCard key={s.id} startup={s} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        pages={result.pages}
        params={{ q, tag, sort: sort === "popular" ? undefined : sort }}
      />
    </div>
  );
}
