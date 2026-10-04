"use client";

import { useFormStatus } from "react-dom";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

export function SubmitButton({
  children,
  pendingText,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const { d } = useI18n();
  return (
    <button type="submit" disabled={pending} className={cn(variant === "primary" ? "btn-primary" : "btn-secondary", className)} aria-busy={pending}>
      {pending ? (pendingText ?? d.common.saving) : children}
    </button>
  );
}
