"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n/client";
import { SearchIcon } from "./icons";

export function SearchBar() {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={d.nav.search}
        aria-label={d.nav.search}
        className="input h-10 rounded-full border-transparent bg-surface-2 pl-9 focus:bg-surface"
      />
    </form>
  );
}
