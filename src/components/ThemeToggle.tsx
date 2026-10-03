"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const { d } = useI18n();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage недоступен — тема просто не запомнится */
    }
  }

  return (
    <button type="button" onClick={toggle} className="btn-ghost px-2.5" aria-label={d.nav.theme}>
      {dark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
