"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { createCollab } from "@/app/actions/collab";
import { useI18n } from "@/i18n/client";
import { fill } from "@/i18n/format";
import { COLLAB_KINDS } from "@/lib/validation";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";
import { HandshakeIcon } from "./icons";

/** Кнопка «Предложить коллаборацию», раскрывающая форму */
export function CollabForm({
  toStartupId,
  toUserId,
  targetName,
  myStartups,
  loggedIn,
  loginHref,
}: {
  toStartupId?: string;
  toUserId?: string;
  targetName: string;
  myStartups: { id: string; name: string }[];
  loggedIn: boolean;
  loginHref: string;
}) {
  const { d } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(createCollab, { ok: false });

  if (!loggedIn) {
    return (
      <a href={loginHref} className="btn-secondary w-full">
        <HandshakeIcon className="h-4 w-4" /> {d.collab.loginToPropose}
      </a>
    );
  }
  if (state.ok) return <FormMessage ok message={state.message} />;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full">
        <HandshakeIcon className="h-4 w-4" /> {d.collab.propose}
      </button>
    );
  }
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="text-sm font-semibold">
        {fill(toStartupId ? d.collab.proposeTo : d.collab.proposeToUser, { name: targetName })}
      </div>
      {!state.ok && state.message && <FormMessage ok={false} message={state.message} />}
      <input type="hidden" name="toStartupId" value={toStartupId ?? ""} />
      <input type="hidden" name="toUserId" value={toUserId ?? ""} />
      <label className="block">
        <span className="label">{d.collab.kind}</span>
        <select name="kind" className="input" defaultValue="integration">
          {COLLAB_KINDS.map((k) => (
            <option key={k} value={k}>{d.collab.kinds[k]}</option>
          ))}
        </select>
      </label>
      {myStartups.length > 0 && (
        <label className="block">
          <span className="label">{d.collab.fromProject}</span>
          <select name="fromStartupId" className="input" defaultValue="">
            <option value="">{d.collab.fromMe}</option>
            {myStartups.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="label">{d.collab.message}</span>
        <textarea name="message" rows={4} required minLength={10} maxLength={1000} className="input" placeholder={d.collab.messagePh} />
        <FieldError errors={e.message} />
      </label>
      <label className="block">
        <span className="label">{d.collab.contact}</span>
        <input name="contact" maxLength={200} className="input" placeholder={d.collab.contactPh} />
      </label>
      <div className="flex gap-2">
        <SubmitButton>{d.collab.send}</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">{d.common.cancel}</button>
      </div>
    </form>
  );
}
