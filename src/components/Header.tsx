import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { GithubIcon } from "./icons";
import { SectionAddButton, SectionSubNav, SectionTabs } from "./CampNav";

export async function Header() {
  const [user, { d }] = await Promise.all([getCurrentUser(), Promise.resolve(getI18n())]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base font-black text-white">A</span>
          <span className="text-[18px] tracking-tight">AYMA</span>
        </Link>

        <Suspense fallback={null}>
          <SectionTabs className="hidden md:flex" />
        </Suspense>

        <div className="order-last w-full md:order-none md:mx-4 md:w-auto md:flex-1">
          <Suspense fallback={<div className="h-10 rounded-full bg-surface-2" />}>
            <SearchBar />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LanguageSwitcher />
          <ThemeToggle />
          <Suspense fallback={null}>
            <SectionAddButton />
          </Suspense>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link href="/login" className="btn-primary">
              <GithubIcon className="h-4 w-4" />
              {d.nav.login}
            </Link>
          )}
        </div>

        {/* Мобильная навигация: три раздела */}
        <div className="order-[90] w-full md:hidden">
          <Suspense fallback={null}>
            <SectionTabs compact className="w-full justify-between [&>a]:flex-1 [&>a]:justify-center" />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={null}>
        <SectionSubNav />
      </Suspense>
    </header>
  );
}
