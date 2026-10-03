import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { GithubIcon, PlusIcon } from "./icons";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base font-black text-white">
            A
          </span>
          <span className="text-[18px] tracking-tight">AYMA</span>
          <span className="hidden text-xs font-medium text-muted lg:inline">маркетплейс ИИ-стартапов</span>
        </Link>

        <div className="order-last w-full md:order-none md:mx-6 md:w-auto md:flex-1">
          <Suspense fallback={<div className="h-10 rounded-lg bg-surface-2" />}>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="ml-auto flex items-center gap-1.5 md:ml-0">
          <ThemeToggle />
          <Link href="/startup/new" className="btn-secondary hidden sm:inline-flex">
            <PlusIcon className="h-4 w-4" />
            Добавить стартап
          </Link>
          <Link href="/startup/new" className="btn-secondary px-2.5 sm:hidden" aria-label="Добавить стартап">
            <PlusIcon className="h-4 w-4" />
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="btn-primary">
              <GithubIcon className="h-4 w-4" />
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
