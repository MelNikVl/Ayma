"use client";

import { useEffect, useRef } from "react";

/** Официальный Telegram Login Widget. Работает только на домене, указанном боту через /setdomain. */
export function TelegramLoginButton({ botUsername, authUrl }: { botUsername: string; authUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, [botUsername, authUrl]);

  return <div ref={ref} className="flex min-h-[44px] justify-center" />;
}
