"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { createPreOrder } from "@/app/actions/preorder";
import { useI18n } from "@/i18n/client";
import { formatPrice } from "@/i18n/format";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

export function SponsorForm({ startupId, price, defaultContact }: { startupId: string; price: number; defaultContact: string }) {
  const { d, locale } = useI18n();
  const [state, formAction] = useFormState(createPreOrder, { ok: false });
  const [qty, setQty] = useState(1);
  const e = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="startupId" value={startupId} />
      {state.message && !state.ok && <FormMessage ok={false} message={state.message} />}

      <div>
        <label htmlFor="quantity" className="label">{d.sponsorPage.quantity}</label>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={d.sponsorPage.less}>−</button>
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
          <button type="button" className="btn-secondary h-10 w-10 p-0" onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label={d.sponsorPage.more}>+</button>
        </div>
        <FieldError errors={e.quantity} />
      </div>

      <div>
        <label htmlFor="contactInfo" className="label">{d.sponsorPage.contact} *</label>
        <input id="contactInfo" name="contactInfo" defaultValue={defaultContact} required maxLength={200} className="input" placeholder={d.sponsorPage.contactPh} />
        <p className="hint">{d.sponsorPage.contactHint}</p>
        <FieldError errors={e.contactInfo} />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
        <span className="text-muted">
          {d.sponsorPage.agree}{" "}
          <Link href="/terms" target="_blank" className="text-accent hover:underline">{d.sponsorPage.agreeLink}</Link>.
        </span>
      </label>
      <FieldError errors={e.agree} />

      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <div>
          <div className="text-xs text-muted">{d.sponsorPage.total}</div>
          <div className="text-2xl font-bold tabular-nums">{formatPrice(price * qty, locale)}</div>
        </div>
        <SubmitButton pendingText={d.sponsorPage.submitting} className="px-6 py-3">{d.sponsorPage.submit}</SubmitButton>
      </div>
    </form>
  );
}
