import Link from "next/link";
import type { JobCardData } from "@/lib/jobs";
import { getI18n } from "@/i18n/server";
import { fill, formatPrice, formatRelative, plural } from "@/i18n/format";
import type { Dict } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { ClockIcon, CoinsIcon } from "./icons";

export function jobBudget(
  j: { budgetMin: number | null; budgetMax: number | null },
  d: Dict,
  locale: Locale,
): string {
  const { budgetMin: min, budgetMax: max } = j;
  if (min && max) return min === max ? formatPrice(min, locale) : `${formatPrice(min, locale)} – ${formatPrice(max, locale)}`;
  if (min) return fill(d.jobs.budgetFrom, { min: formatPrice(min, locale) });
  if (max) return fill(d.jobs.budgetUpTo, { max: formatPrice(max, locale) });
  return d.jobs.negotiable;
}

export function JobStatusPill({ status, d }: { status: keyof Dict["jobs"]["status"]; d: Dict }) {
  const cls: Record<string, string> = {
    OPEN: "bg-success/12 text-success",
    IN_PROGRESS: "bg-accent/12 text-accent",
    DONE: "bg-fg/10 text-fg",
    CLOSED: "bg-fg/5 text-muted",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", cls[status])}>
      {status === "OPEN" && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {d.jobs.status[status]}
    </span>
  );
}

/** Карточка задачи в ленте заказов */
export function JobCard({ job, compact = false }: { job: JobCardData; compact?: boolean }) {
  const { d, locale } = getI18n();
  const company = job.company ?? job.author.company;
  return (
    <article className={cn("group relative rounded-2xl transition-colors hover:bg-surface-2/70", compact ? "p-2.5" : "p-4 sm:p-5")}>
      <Link href={`/jobs/${job.id}`} className="absolute inset-0 rounded-2xl" aria-label={job.title} />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {job.status !== "OPEN" && <JobStatusPill status={job.status} d={d} />}
            {company && <span className="font-semibold text-fg/80">{company}</span>}
            <span>{formatRelative(job.createdAt, locale)}</span>
          </div>
          <h3 className={cn("mt-1 font-bold leading-snug group-hover:text-accent", compact ? "line-clamp-2 text-sm" : "text-base sm:text-lg")}>
            {job.title}
          </h3>
          {!compact && <p className="mt-1 line-clamp-2 text-sm text-muted">{job.description}</p>}
          <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs", compact ? "mt-1.5" : "mt-3")}>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums">
              <CoinsIcon className="h-3.5 w-3.5 text-warning" /> {jobBudget(job, d, locale)}
            </span>
            {job.deadlineDays && !compact && (
              <span className="inline-flex items-center gap-1 text-muted">
                <ClockIcon className="h-3.5 w-3.5" /> {fill(d.jobs.days, { n: job.deadlineDays })}
              </span>
            )}
            {!compact &&
              job.categories.map((c) => (
                <Link
                  key={c}
                  href={`/jobs?cat=${c}`}
                  className="relative z-10 rounded-md bg-surface-2 px-1.5 py-0.5 text-muted hover:text-fg"
                >
                  {d.jobs.cat[c as keyof Dict["jobs"]["cat"]] ?? c}
                </Link>
              ))}
          </div>
        </div>
        <div className="shrink-0 text-center">
          <div className={cn("font-extrabold tabular-nums", compact ? "text-base" : "text-xl")}>{job.responsesCount}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted">{plural(job.responsesCount, d.jobs.respForms, locale)}</div>
        </div>
      </div>
    </article>
  );
}
