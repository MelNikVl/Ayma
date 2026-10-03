"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ClaimState } from "@/app/actions/team";
import { useI18n } from "@/i18n/client";
import { SubmitButton } from "./SubmitButton";
import { FormMessage } from "./FormMessage";

type Action = (prev: ClaimState, formData: FormData) => Promise<ClaimState>;

export function ClaimForm({ action, hasGithub }: { action: Action; hasGithub: boolean }) {
  const { d } = useI18n();
  const [state, formAction] = useFormState(action, { ok: false });
  const [open, setOpen] = useState(false);

  if (state.ok) return <FormMessage ok message={state.message} />;

  return (
    <form action={formAction} className="space-y-3">
      {state.message && <FormMessage ok={false} message={state.message} />}
      {open && (
        <label className="block">
          <span className="label">{d.startup.claimCommentLabel}</span>
          <textarea name="message" rows={2} maxLength={500} className="input" placeholder={d.startup.claimCommentPh} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText={d.startup.claimChecking}>{d.startup.claim}</SubmitButton>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm text-muted">
            {d.startup.claimComment}
          </button>
        )}
      </div>
      <p className="hint">{hasGithub ? d.startup.claimHintGithub : d.startup.claimHintNoGithub}</p>
    </form>
  );
}
