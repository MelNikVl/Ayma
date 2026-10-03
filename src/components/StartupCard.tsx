import Link from "next/link";
import type { StartupCardData } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import { StartupLogo } from "./StartupLogo";
import { TagBadge } from "./TagBadge";
import { GithubBadge } from "./GithubBadge";

export function StartupCard({ startup }: { startup: StartupCardData }) {
  const href = `/startup/${startup.slug}`;
  const canPreorder = startup.preOrderEnabled && startup.preOrderPrice > 0;

  return (
    <article className="card group relative flex h-full flex-col p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover sm:p-5">
      {/* Ссылка-оверлей: вся карточка кликабельна, а кнопки внутри остаются отдельными ссылками */}
      <Link href={href} className="absolute inset-0 z-0 rounded-card" aria-label={startup.name} />

      <div className="flex items-start gap-3">
        <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight group-hover:text-accent">{startup.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted">{startup.shortDesc}</p>
        </div>
      </div>

      {startup.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {startup.tags.slice(0, 4).map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} />
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        {startup.githubUrl && (
          <div className="mb-3">
            <GithubBadge stars={startup.githubStars} lastCommit={startup.githubLastCommit} />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          {canPreorder ? (
            <>
              <div className="min-w-0 leading-tight">
                <div className="text-[11px] uppercase tracking-wide text-muted">Предзаказ от</div>
                <div className="truncate text-lg font-bold">{formatPrice(startup.preOrderPrice)}</div>
              </div>
              <Link href={`${href}/sponsor`} className="btn-primary relative z-10 shrink-0 px-3.5">
                Стать спонсором
              </Link>
            </>
          ) : (
            <>
              <span className="text-sm text-muted">Предзаказ скоро</span>
              <Link href={href} className="btn-secondary btn-sm relative z-10">
                Подробнее
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
