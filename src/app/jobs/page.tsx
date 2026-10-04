import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { JOB_CATEGORIES } from "@/lib/validation";
import { getI18n } from "@/i18n/server";
import { fill, formatNumber, plural } from "@/i18n/format";
import { JobCard } from "@/components/JobCard";
import { Pagination } from "@/components/Pagination";
import { PlusIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const { d } = getI18n();
  return { title: d.jobs.boardTitle, description: d.jobs.boardText };
}

type SP = { cat?: string; all?: string; page?: string };

function href(p: SP) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/jobs?${s}` : "/jobs";
}

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const { d, locale } = getI18n();
  const cat = searchParams.cat && (JOB_CATEGORIES as readonly string[]).includes(searchParams.cat) ? searchParams.cat : undefined;
  const all = searchParams.all === "1";
  const page = Number(searchParams.page) || 1;
  const result = await listJobs({ cat, all, page });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{d.jobs.boardTitle}</h1>
          <p className="mt-2 max-w-xl text-muted">{d.jobs.boardText}</p>
        </div>
        <Link href="/jobs/new" className="btn-primary shrink-0 px-5 py-2.5">
          <PlusIcon className="h-4 w-4" /> {d.jobs.post}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-border bg-surface p-0.5 text-sm font-semibold">
          {[
            [false, d.jobs.filterOpen],
            [true, d.jobs.filterAll],
          ].map(([v, label]) => (
            <Link
              key={String(v)}
              href={href({ cat, all: v ? "1" : undefined })}
              aria-pressed={all === v}
              className={cn("rounded-lg px-3 py-1.5", all === v ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              {label as string}
            </Link>
          ))}
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
          {JOB_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={href({ cat: cat === c ? undefined : c, all: all ? "1" : undefined })}
              aria-pressed={cat === c}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                cat === c ? "border-fg bg-fg text-bg" : "border-border bg-surface text-muted hover:text-fg",
              )}
            >
              {d.jobs.cat[c]}
            </Link>
          ))}
        </div>
      </div>

      <p className="mb-3 mt-6 text-sm text-muted">
        {fill(d.jobs.count, { n: formatNumber(result.total, locale), jobs: plural(result.total, d.jobs.jobsForms, locale) })}
      </p>

      {result.items.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <div className="text-4xl">📝</div>
          <h2 className="mt-3 text-lg font-semibold">{d.jobs.empty}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">{d.jobs.emptyText}</p>
          <Link href="/jobs/new" className="btn-primary mt-5">{d.jobs.post}</Link>
        </div>
      ) : (
        <div className="card divide-y divide-border/50 p-1.5 sm:p-2">
          {result.items.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}

      <Pagination page={result.page} pages={result.pages} params={{ cat, all: all ? "1" : undefined }} basePath="/jobs" />
    </div>
  );
}
