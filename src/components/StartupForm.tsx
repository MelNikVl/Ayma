"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { FormState } from "@/lib/validation";
import { cn } from "@/lib/cn";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface StartupFormDefaults {
  name: string;
  shortDesc: string;
  fullDesc: string;
  logoUrl: string;
  coverUrl: string;
  githubUrl: string;
  demoUrl: string;
  websiteUrl: string;
  tagIds: string[];
  preOrderEnabled: boolean;
  preOrderPrice: number;
  preOrderGoal: number;
  preOrderDesc: string;
  paymentUrl: string;
}

export const emptyStartupDefaults: StartupFormDefaults = {
  name: "",
  shortDesc: "",
  fullDesc: "",
  logoUrl: "",
  coverUrl: "",
  githubUrl: "",
  demoUrl: "",
  websiteUrl: "",
  tagIds: [],
  preOrderEnabled: true,
  preOrderPrice: 5000,
  preOrderGoal: 0,
  preOrderDesc: "",
  paymentUrl: "",
};

export function StartupForm({
  action,
  tags,
  defaults,
  submitLabel,
}: {
  action: Action;
  tags: { id: string; name: string; color: string }[];
  defaults: StartupFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [shortDesc, setShortDesc] = useState(defaults.shortDesc);
  const [selected, setSelected] = useState<string[]>(defaults.tagIds);
  const [preorder, setPreorder] = useState(defaults.preOrderEnabled);
  const e = state.fieldErrors ?? {};

  function toggleTag(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]));
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {state.message}
        </div>
      )}

      <section className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Основное</h2>
        <div>
          <label htmlFor="name" className="label">Название *</label>
          <input id="name" name="name" defaultValue={defaults.name} required maxLength={60} className="input" placeholder="Например, KazNLP" />
          <FieldError errors={e.name} />
        </div>
        <div>
          <label htmlFor="shortDesc" className="label">Короткое описание *</label>
          <input
            id="shortDesc"
            name="shortDesc"
            value={shortDesc}
            onChange={(ev) => setShortDesc(ev.target.value)}
            required
            maxLength={150}
            className="input"
            placeholder="Одна фраза о том, что делает продукт"
          />
          <p className="hint">{shortDesc.length}/150 — показывается в карточке каталога</p>
          <FieldError errors={e.shortDesc} />
        </div>
        <div>
          <label htmlFor="fullDesc" className="label">Полное описание * <span className="font-normal text-muted">(Markdown)</span></label>
          <textarea
            id="fullDesc"
            name="fullDesc"
            defaultValue={defaults.fullDesc}
            required
            rows={10}
            className="input font-mono text-[13px] leading-6"
            placeholder={"## Проблема\n...\n\n## Решение\n...\n\n## Roadmap\n- [x] MVP\n- [ ] Публичный API"}
          />
          <FieldError errors={e.fullDesc} />
        </div>
        <div>
          <span className="label">Теги <span className="font-normal text-muted">(до 5)</span></span>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={cn("chip", on ? "border-transparent text-white" : "border-border bg-surface hover:border-fg/40")}
                  style={on ? { backgroundColor: t.color } : undefined}
                  aria-pressed={on}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {selected.map((id) => (
            <input key={id} type="hidden" name="tagIds" value={id} />
          ))}
          <FieldError errors={e.tagIds} />
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-bold">Ссылки и медиа</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <UrlField name="logoUrl" label="Логотип (URL картинки)" defaultValue={defaults.logoUrl} errors={e.logoUrl} hint="Квадрат, от 256×256" />
          <UrlField name="coverUrl" label="Обложка (URL картинки)" defaultValue={defaults.coverUrl} errors={e.coverUrl} hint="Широкая, 1200×400" />
          <UrlField name="githubUrl" label="GitHub-репозиторий" defaultValue={defaults.githubUrl} errors={e.githubUrl} placeholder="https://github.com/owner/repo" hint="Звёзды и дату коммита подтянем автоматически" />
          <UrlField name="demoUrl" label="Демо" defaultValue={defaults.demoUrl} errors={e.demoUrl} />
          <UrlField name="websiteUrl" label="Сайт" defaultValue={defaults.websiteUrl} errors={e.websiteUrl} />
        </div>
      </section>

      <section className="card space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Предзаказ услуги</h2>
            <p className="mt-1 text-sm text-muted">
              Спонсор оплачивает будущую услугу (подписку, доработку, внедрение). Это купля-продажа, а не инвестиции.
            </p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              name="preOrderEnabled"
              checked={preorder}
              onChange={(ev) => setPreorder(ev.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5" />
            <span className="sr-only">Включить предзаказ</span>
          </label>
        </div>

        <div className={cn("space-y-5", !preorder && "pointer-events-none opacity-50")} aria-disabled={!preorder}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="preOrderPrice" className="label">Цена услуги, ₸ *</label>
              <input id="preOrderPrice" name="preOrderPrice" type="number" min={0} step={100} defaultValue={defaults.preOrderPrice} className="input" />
              <FieldError errors={e.preOrderPrice} />
            </div>
            <div>
              <label htmlFor="preOrderGoal" className="label">Цель сбора, ₸</label>
              <input id="preOrderGoal" name="preOrderGoal" type="number" min={0} step={1000} defaultValue={defaults.preOrderGoal} className="input" />
              <p className="hint">0 — без прогресс-бара</p>
              <FieldError errors={e.preOrderGoal} />
            </div>
          </div>
          <div>
            <label htmlFor="preOrderDesc" className="label">Что получит спонсор *</label>
            <textarea
              id="preOrderDesc"
              name="preOrderDesc"
              defaultValue={defaults.preOrderDesc}
              rows={3}
              className="input"
              placeholder="Годовая подписка на Pro-тариф после релиза (до 1 марта 2027). Если не выпустим — вернём деньги."
            />
            <FieldError errors={e.preOrderDesc} />
          </div>
          <UrlField
            name="paymentUrl"
            label="Ссылка на оплату"
            defaultValue={defaults.paymentUrl}
            errors={e.paymentUrl}
            placeholder="https://pay.kaspi.kz/pay/..."
            hint="Kaspi Pay, Stripe Payment Link и т.п. Можно оставить пустым — тогда договоритесь со спонсором в Telegram."
          />
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton className="w-full px-6 sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function UrlField({
  name,
  label,
  defaultValue,
  errors,
  placeholder = "https://",
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  errors?: string[];
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type="url" inputMode="url" defaultValue={defaultValue} placeholder={placeholder} className="input" />
      {hint && <p className="hint">{hint}</p>}
      <FieldError errors={errors} />
    </div>
  );
}
