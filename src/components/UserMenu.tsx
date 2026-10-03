import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { displayName } from "@/lib/format";
import { Avatar } from "./Avatar";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center rounded-full p-0.5 ring-accent/40 hover:ring-2 [&::-webkit-details-marker]:hidden">
        <Avatar user={user} size={34} />
      </summary>
      <div className="card absolute right-0 mt-2 w-56 overflow-hidden p-1.5 shadow-card-hover">
        <div className="px-3 py-2 text-sm">
          <div className="truncate font-semibold">{user.firstName ?? displayName(user)}</div>
          {user.username && <div className="truncate text-xs text-muted">@{user.username}</div>}
        </div>
        <div className="my-1 h-px bg-border" />
        <Link href="/dashboard" className="block rounded-md px-3 py-2 text-sm hover:bg-surface-2">
          Мой кабинет
        </Link>
        <Link href="/startup/new" className="block rounded-md px-3 py-2 text-sm hover:bg-surface-2">
          Добавить стартап
        </Link>
        {user.role === "ADMIN" && (
          <Link href="/admin" className="block rounded-md px-3 py-2 text-sm hover:bg-surface-2">
            Модерация
          </Link>
        )}
        <div className="my-1 h-px bg-border" />
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-surface-2">
            Выйти
          </button>
        </form>
      </div>
    </details>
  );
}
