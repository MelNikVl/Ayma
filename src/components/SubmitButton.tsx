"use client";

import { useFormStatus } from "react-dom";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const { d } = useI18n();
  return (
    <button type="submit" disabled={pending} className={cn("btn-primary", className)} aria-busy={pending}>
      {pending ? (pendingText ?? d.common.saving) : children}
    </button>
  );
}
