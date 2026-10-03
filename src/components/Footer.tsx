import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} AYMA · Open Source (MIT)</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-fg">
            Условия предзаказа
          </Link>
          <a href="https://github.com/MelNikVl/Ayma" target="_blank" rel="noreferrer" className="hover:text-fg">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
