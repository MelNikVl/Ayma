import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { GithubIcon, PlusIcon } from "./icons";

export async function Header() {
  const [user, { d }] = await Promise.all([getCurrentUser(), Promise.resolve(getI18n())]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base font-black text-white">A</span>
          <span className="text-[18px] tracking-tight">AYMA</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          <Link href="/" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-fg">{d.nav.catalog}</Link>
          <Link href="/rating" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-fg">{d.nav.rating}</Link>
          <Link href="/collabs" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface-2 hover:text-fg">{d.nav.collabs}</Link>
        </nav>

        <div className="order-last w-full md:order-none md:mx-4 md:w-auto md:flex-1">
          <Suspense fallback={<div className="h-10 rounded-full bg-surface-2" />}>
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/startup/new" className="btn-secondary hidden xl:inline-flex">
            <PlusIcon className="h-4 w-4" />
            {d.nav.add}
          </Link>
          <Link href="/startup/new" className="btn-secondary px-2.5 xl:hidden" aria-label={d.nav.add}>
            <PlusIcon className="h-4 w-4" />
          </Link>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="btn-primary">
              <GithubIcon className="h-4 w-4" />
              {d.nav.login}
            </Link>
          )}
        </div>

        {/* Мобильная навигация */}
        <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto text-sm font-medium no-scrollbar lg:hidden">
          <Link href="/" className="shrink-0 rounded-md px-2.5 py-1 text-muted hover:text-fg">{d.nav.catalog}</Link>
          <Link href="/rating" className="shrink-0 rounded-md px-2.5 py-1 text-muted hover:text-fg">{d.nav.rating}</Link>
          <Link href="/collabs" className="shrink-0 rounded-md px-2.5 py-1 text-muted hover:text-fg">{d.nav.collabs}</Link>
        </nav>
      </div>
    </header>
  );
}
