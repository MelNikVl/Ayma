import { formatCompact, formatRelative } from "@/lib/format";
import { GithubIcon } from "./icons";

export function GithubBadge({ stars, lastCommit }: { stars: number; lastCommit: Date | null }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
      <GithubIcon className="h-3.5 w-3.5" />
      <span className="whitespace-nowrap">⭐ {formatCompact(stars)}</span>
      {lastCommit && (
        <>
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">обновлено {formatRelative(lastCommit)}</span>
        </>
      )}
    </span>
  );
}
