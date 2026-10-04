import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { displayName } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { fill, formatRelative, plural } from "@/i18n/format";
import { deleteComment } from "@/app/actions/comments";
import { nextCommentAt } from "@/lib/comments";
import { Avatar } from "./Avatar";
import { CommentForm } from "./CommentForm";
import { SubmitButton } from "./SubmitButton";
import { profileHref } from "./UserMenu";

/** Обсуждение проекта в стиле Product Hunt */
export async function Comments({
  startupId,
  memberIds,
  user,
  loginHref,
}: {
  startupId: string;
  memberIds: string[];
  user: SessionUser | null;
  loginHref: string;
}) {
  const { d, locale } = getI18n();
  const [comments, next] = await Promise.all([
    prisma.comment.findMany({
      where: { startupId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, firstName: true, username: true, avatarUrl: true, githubLogin: true } } },
    }),
    user ? nextCommentAt(user.id, startupId) : Promise.resolve(null),
  ]);

  return (
    <section className="card p-5 sm:p-7" id="comments">
      <h2 className="p-head mb-4 text-lg font-bold">
        {d.comments.title}{" "}
        <span className="font-normal text-muted">
          {comments.length} {plural(comments.length, d.comments.forms, locale)}
        </span>
      </h2>

      {!user ? (
        <Link href={loginHref} className="btn-secondary w-full">{d.comments.login}</Link>
      ) : next ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          {fill(d.comments.limitReached, { when: formatRelative(next, locale) })}
        </p>
      ) : (
        <div className="flex gap-3">
          <Avatar user={user} size={36} className="mt-1 hidden sm:block" />
          <div className="min-w-0 flex-1">
            <CommentForm startupId={startupId} />
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="mt-5 text-sm text-muted">{d.comments.empty}</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {comments.map((c) => {
            const isTeam = memberIds.includes(c.userId);
            const canDelete = user && (user.id === c.userId || user.role === "ADMIN");
            return (
              <li key={c.id} className="flex gap-3">
                <Link href={profileHref(c.user)} className="shrink-0">
                  <Avatar user={c.user} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <Link href={profileHref(c.user)} className="font-semibold hover:text-accent">
                      {c.user.firstName ?? displayName(c.user)}
                    </Link>
                    {isTeam && <span className="rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-bold text-accent">{d.comments.team}</span>}
                    <span className="text-xs text-muted">{formatRelative(c.createdAt, locale)}</span>
                    {canDelete && (
                      <form action={deleteComment.bind(null, c.id)} className="ml-auto">
                        <SubmitButton variant="secondary" className="border-0 bg-transparent px-1 py-0 text-xs text-muted shadow-none hover:text-danger">
                          {d.comments.delete}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">{c.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
