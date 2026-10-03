"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleVote } from "@/app/actions/votes";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";
import { ArrowUpIcon } from "./icons";

/** Кнопка голоса в стиле Product Hunt: стрелка + число. */
export function VoteButton({
  startupId,
  count,
  voted,
  size = "md",
}: {
  startupId: string;
  count: number;
  voted: boolean;
  size?: "md" | "lg";
}) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ count, voted });
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const optimistic = { voted: !state.voted, count: state.count + (state.voted ? -1 : 1) };
    setState(optimistic);
    startTransition(async () => {
      const res = await toggleVote(startupId);
      if (res.needLogin) {
        setState({ count, voted });
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (res.ok) setState({ voted: res.voted, count: res.count });
      else setState({ count, voted });
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={state.voted}
      title={state.voted ? d.card.voted : d.card.vote}
      className={cn(
        "relative z-10 flex shrink-0 flex-col items-center justify-center rounded-xl border font-bold tabular-nums transition-all",
        size === "lg" ? "h-16 w-16 text-base" : "h-14 w-12 text-sm",
        state.voted
          ? "border-accent bg-accent text-white shadow-[0_6px_16px_-6px_rgb(var(--accent)/0.7)]"
          : "border-border bg-surface text-fg hover:border-accent hover:text-accent",
      )}
    >
      <ArrowUpIcon className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.5} />
      <span>{state.count}</span>
    </button>
  );
}
