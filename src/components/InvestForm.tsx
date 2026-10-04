"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { submitInvestInterest } from "@/app/actions/invest";
import { useI18n } from "@/i18n/client";
import { INVEST_FORMATS } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

const PRESETS = [500_000, 1_000_000, 5_000_000, 10_000_000];

export function InvestForm({
  startupId,
  defaults,
  isUpdate,
}: {
  startupId: string;
  defaults: { amount: string; format: string; contact: string; message: string };
  isUpdate: boolean;
}) {
  const { d, locale } = useI18n();
  const t = d.invest;
  const [state, action] = useFormState(submitInvestInterest.bind(null, startupId), { ok: false });
  const [amount, setAmount] = useState(defaults.amount);
  const [format, setFormat] = useState(defaults.format || "equity");
  const e = state?.fieldErrors ?? {};
  const fmt = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  return (
    <form action={action} className="space-y-5">
      {state?.message && <FormMessage ok={state.ok} message={state.message} />}

      <div>
        <label htmlFor="amount" className="label">{t.amount}</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                amount === String(p) ? "border-fg bg-fg text-bg" : "border-border hover:border-fg/30",
              )}
            >
              {fmt(p)} ₸
            </button>
          ))}
        </div>
        <input
          id="amount"
          name="amount"
          type="number"
          min={10000}
          step={1000}
          required
          inputMode="numeric"
          value={amount}
          onChange={(ev) => setAmount(ev.target.value)}
          className="input mt-2 text-lg font-bold tabular-nums"
        />
        <FieldError errors={e.amount} />
      </div>

      <fieldset>
        <legend className="label">{t.format}</legend>
        <input type="hidden" name="format" value={format} />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {INVEST_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              onClick={() => setFormat(f)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                format === f ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border hover:border-fg/30",
              )}
            >
              {t.formats[f]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="contact" className="label">{t.contact}</label>
        <input id="contact" name="contact" required maxLength={200} defaultValue={defaults.contact} className="input" placeholder={t.contactPh} />
        <p className="mt-1 text-xs text-muted">{t.contactHint}</p>
        <FieldError errors={e.contact} />
      </div>

      <div>
        <label htmlFor="message" className="label">{t.message}</label>
        <textarea id="message" name="message" rows={3} maxLength={1000} defaultValue={defaults.message} className="input" placeholder={t.messagePh} />
        <FieldError errors={e.message} />
      </div>

      <SubmitButton pendingText={t.submitting} className="w-full py-3 text-base">
        {isUpdate ? t.update : t.submit}
      </SubmitButton>
      <p className="text-xs leading-relaxed text-muted">{t.disclaimer}</p>
    </form>
  );
}
