import { cn } from "@/lib/cn";
import { getI18n } from "@/i18n/server";

const startupTone: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/10 text-danger",
};
const payTone: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  PAID: "bg-success/15 text-success",
  CANCELED: "bg-surface-2 text-muted",
};

export function StatusPill({ status, kind = "startup" }: { status: string; kind?: "startup" | "payment" }) {
  const { d } = getI18n();
  const label =
    kind === "startup"
      ? (d.status as Record<string, unknown>)[status]
      : (d.status.pay as Record<string, string>)[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        (kind === "startup" ? startupTone : payTone)[status] ?? "bg-surface-2",
      )}
    >
      {typeof label === "string" ? label : status}
    </span>
  );
}
