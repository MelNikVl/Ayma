import type { RepoMeta } from "@/lib/repo-meta";
import { getI18n } from "@/i18n/server";
import { fill } from "@/i18n/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 truncate font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export { Stat };

/** Данные репозитория из импорта: статистика, авторы, коммиты, структура, ветки */
export function RepoDetails({ meta, repoUrl }: { meta: RepoMeta; repoUrl: string }) {
  const { d } = getI18n();
  const seen = new Set<string>();
  const commits = (meta.commits ?? []).filter((c) => {
    const k = c.join("|");
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const newestFirst = [...commits].reverse();
  const authors = meta.authors ?? [];
  const tree = meta.tree ?? [];
  const branches = meta.branches ?? [];
  const fmt = (dt: string) => dt.replace("T", " ");

  const row = ([date, author, msg]: [string, string, string], i: number) => (
    <li key={i} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 font-mono text-xs text-muted">{fmt(date)}</span>
      <span className="min-w-0 flex-1 truncate">{msg}</span>
      <span className="shrink-0 text-xs text-muted">{author}</span>
    </li>
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={d.startup.commits} value={String(commits.length)} />
        <Stat label={d.startup.authors} value={String(authors.length)} />
        <Stat label={d.startup.files} value={String(tree.length)} />
        <Stat label={d.startup.branches} value={String(branches.length || 1)} />
      </div>

      {authors.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{d.startup.commitAuthors}</h3>
          <div className="flex flex-wrap gap-1.5">
            {authors.map(([name, n]) => (
              <span key={name} className="rounded-md bg-surface-2 px-2 py-1 text-xs">
                {name} <b className="font-semibold text-muted">{n}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {newestFirst.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">{d.startup.commitHistory}</h3>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60 text-sm">{newestFirst.slice(0, 8).map(row)}</ul>
          {newestFirst.length > 8 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-accent">{fill(d.startup.allCommits, { n: newestFirst.length })}</summary>
              <ul className="mt-2 max-h-96 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60 text-sm">
                {newestFirst.slice(8).map(row)}
              </ul>
            </details>
          )}
        </div>
      )}

      {tree.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">{fill(d.startup.structure, { n: tree.length })}</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-surface-2 p-4 font-mono text-xs leading-5">{tree.join("\n")}</pre>
        </details>
      )}

      {branches.length > 1 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            {d.startup.branches} ({branches.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {branches.map((b) => (
              <a
                key={b}
                href={`${repoUrl}/tree/${encodeURIComponent(b)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-surface-2 px-2 py-1 font-mono text-xs hover:text-accent"
              >
                {b}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
