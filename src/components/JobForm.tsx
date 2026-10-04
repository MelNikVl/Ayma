"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createJob } from "@/app/actions/jobs";
import { useI18n } from "@/i18n/client";
import { JOB_CATEGORIES } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

export function JobForm({ defaultTitle = "", defaultCompany = "", defaultContact = "" }: {
  defaultTitle?: string;
  defaultCompany?: string;
  defaultContact?: string;
}) {
  const { d } = useI18n();
  const t = d.jobs;
  const [state, action] = useFormState(createJob, { ok: false });
  const [cats, setCats] = useState<string[]>([]);
  const e = state.fieldErrors ?? {};

  const toggle = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length >= 3 ? prev : [...prev, c]));

  return (
    <form action={action} className="card space-y-5 p-5 sm:p-7">
      {!state.ok && state.message && <FormMessage ok={false} message={state.message} />}

      <div>
        <label htmlFor="title" className="label">{t.fTitle}</label>
        <input id="title" name="title" required minLength={5} maxLength={120} defaultValue={defaultTitle} className="input text-base" placeholder={t.fTitlePh} />
        <FieldError errors={e.title} />
      </div>

      <div>
        <label htmlFor="description" className="label">{t.fDesc}</label>
        <textarea id="description" name="description" required minLength={30} maxLength={5000} rows={7} className="input" placeholder={t.fDescPh} />
        <FieldError errors={e.description} />
      </div>

      <fieldset>
        <legend className="label">{t.fCats}</legend>
        <div className="flex flex-wrap gap-1.5">
          {JOB_CATEGORIES.map((c) => {
            const on = cats.includes(c);
            return (
              <label
                key={c}
                className={cn(
                  "cursor-pointer select-none rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                  on ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-fg/30",
                  !on && cats.length >= 3 && "opacity-50",
                )}
              >
                <input type="checkbox" name="categories" value={c} checked={on} onChange={() => toggle(c)} className="sr-only" />
                {t.cat[c]}
              </label>
            );
          })}
        </div>
        <FieldError errors={e.categories} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="budgetMin" className="label">{t.fBudgetMin}</label>
          <input id="budgetMin" name="budgetMin" type="number" min={0} step={10000} inputMode="numeric" className="input tabular-nums" />
          <FieldError errors={e.budgetMin} />
        </div>
        <div>
          <label htmlFor="budgetMax" className="label">{t.fBudgetMax}</label>
          <input id="budgetMax" name="budgetMax" type="number" min={0} step={10000} inputMode="numeric" className="input tabular-nums" />
          <FieldError errors={e.budgetMax} />
        </div>
        <div>
          <label htmlFor="deadlineDays" className="label">{t.fDeadline}</label>
          <input id="deadlineDays" name="deadlineDays" type="number" min={1} max={365} inputMode="numeric" className="input tabular-nums" />
          <FieldError errors={e.deadlineDays} />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">{t.fBudgetHint}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="label">{t.fCompany}</label>
          <input id="company" name="company" maxLength={80} defaultValue={defaultCompany} className="input" placeholder={t.fCompanyPh} />
          <FieldError errors={e.company} />
        </div>
        <div>
          <label htmlFor="contact" className="label">{t.fContact}</label>
          <input id="contact" name="contact" required maxLength={200} defaultValue={defaultContact} className="input" placeholder={t.fContactPh} />
          <p className="mt-1 text-xs text-muted">{t.fContactHint}</p>
          <FieldError errors={e.contact} />
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{d.biz.noFee}</p>
        <SubmitButton pendingText={t.publishing} className="px-6 py-3">{t.publish}</SubmitButton>
      </div>
    </form>
  );
}
