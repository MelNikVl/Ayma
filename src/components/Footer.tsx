import Link from "next/link";
import { getI18n } from "@/i18n/server";

export function Footer() {
  const { d } = getI18n();
  return (
    <footer className="mt-16 border-t border-border/60 bg-surface">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <div className="flex items-center gap-2 font-bold text-fg">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm font-black text-white">A</span>
            AYMA
          </div>
          <p className="mt-2 max-w-sm">{d.footer.about}</p>
          <p className="mt-3 text-xs">© {new Date().getFullYear()} AYMA · Open Source (MIT)</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link href="/rating#how" className="hover:text-fg">{d.footer.rating}</Link>
          <Link href="/terms" className="hover:text-fg">{d.footer.terms}</Link>
          <a href="https://github.com/MelNikVl/Ayma/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="hover:text-fg">
            {d.footer.contribute}
          </a>
          <a href="https://github.com/MelNikVl/Ayma" target="_blank" rel="noreferrer" className="hover:text-fg">
            {d.footer.github}
          </a>
        </div>
      </div>
    </footer>
  );
}
