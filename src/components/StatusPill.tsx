import { cn } from "@/lib/cn";

const map: Record<string, { label: string; className: string }> = {
  PENDING: { label: "На модерации", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Опубликован", className: "bg-success/15 text-success" },
  REJECTED: { label: "Отклонён", className: "bg-danger/10 text-danger" },
};
const payMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Ждёт оплаты", className: "bg-warning/15 text-warning" },
  PAID: { label: "Оплачен", className: "bg-success/15 text-success" },
  CANCELED: { label: "Отменён", className: "bg-surface-2 text-muted" },
};

export function StatusPill({ status, kind = "startup" }: { status: string; kind?: "startup" | "payment" }) {
  const item = (kind === "startup" ? map : payMap)[status] ?? { label: status, className: "bg-surface-2" };
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", item.className)}>
      {item.label}
    </span>
  );
}
