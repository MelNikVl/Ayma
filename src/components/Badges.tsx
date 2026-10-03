import { cn } from "@/lib/cn";
import { CheckBadgeIcon, CoinsIcon, HandshakeIcon, PlugIcon } from "./icons";

const base = "relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold";

export function ApiBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  if (status === "NONE") return null;
  const tone =
    status === "PUBLIC"
      ? "bg-success/15 text-success"
      : status === "BETA"
        ? "bg-accent/10 text-accent"
        : "bg-surface-2 text-muted";
  return (
    <span className={cn(base, tone, className)} title={label}>
      <PlugIcon className="h-3 w-3" /> {label}
    </span>
  );
}

export function CollabBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn(base, "bg-[#a855f7]/15 text-[#9333ea] dark:text-[#c084fc]", className)} title={label}>
      <HandshakeIcon className="h-3 w-3" /> {label}
    </span>
  );
}

export function FundingBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn(base, "bg-warning/15 text-warning", className)} title={label}>
      <CoinsIcon className="h-3 w-3" /> {label}
    </span>
  );
}

export function VerifiedIcon({ title }: { title: string }) {
  return (
    <span title={title} aria-label={title} className="inline-flex shrink-0 text-accent">
      <CheckBadgeIcon className="h-4 w-4" />
    </span>
  );
}
