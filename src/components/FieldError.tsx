"use client";

import { useI18n } from "@/i18n/client";

export function FieldError({ errors }: { errors?: string[] }) {
  const { d } = useI18n();
  if (!errors?.length) return null;
  const key = errors[0] ?? "";
  return <p className="error-text">{d.errors[key] ?? key}</p>;
}
