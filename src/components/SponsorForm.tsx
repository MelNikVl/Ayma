"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { createPreOrder } from "@/app/actions/preorder";
import { formatPrice } from "@/lib/format";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";

export function SponsorForm({
  startupId,
  price,
  defaultContact,
}: {
  startupId: string;
  price: number;
  defaultContact: string;
}) {
  const [state, formAction] = useFormState(createPreOrder, { ok: false });
  const [qty, setQty] = useState(1);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="startupId" value={startupId} />
      {state.message && !state.ok && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="quantity" className="label">Количество</label>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Меньше">−</button>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={100}
            value={qty}
            onChange={(ev) => setQty(Math.min(100, Math.max(1, Number(ev.target.value) || 1)))}
            className="input h-10 w-20 text-center"
          />
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="Больше">+</button>
        </div>
        <FieldError errors={e.quantity} />
      </div>

      <div>
        <label htmlFor="contactInfo" className="label">Контакт для связи *</label>
        <input id="contactInfo" name="contactInfo" defaultValue={defaultContact} required maxLength={200} className="input" placeholder="@username или email" />
        <p className="hint">Фаундер свяжется с вами для оплаты и оказания услуги</p>
        <FieldError errors={e.contactInfo} />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
        <span className="text-muted">
          Я понимаю, что оформляю <b className="text-fg">предзаказ услуги</b> (купля-продажа), а не инвестицию, и принимаю{" "}
          <Link href="/terms" target="_blank" className="text-accent hover:underline">условия</Link>.
        </span>
      </label>
      <FieldError errors={e.agree} />

      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <div>
          <div className="text-xs text-muted">Итого</div>
          <div className="text-2xl font-bold">{formatPrice(price * qty)}</div>
        </div>
        <SubmitButton pendingText="Оформляем…" className="px-6 py-3">Оформить предзаказ</SubmitButton>
      </div>
    </form>
  );
}
