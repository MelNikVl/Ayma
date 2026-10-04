"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { addComment } from "@/app/actions/comments";
import { useI18n } from "@/i18n/client";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

export function CommentForm({ startupId }: { startupId: string }) {
  const { d } = useI18n();
  const [state, action] = useFormState(addComment.bind(null, startupId), { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <textarea name="text" required minLength={3} maxLength={1000} rows={3} className="input" placeholder={d.comments.placeholder} />
      <FieldError errors={state?.fieldErrors?.text} />
      {state?.message && <FormMessage ok={state.ok} message={state.message} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{d.comments.limitHint}</p>
        <SubmitButton pendingText={d.comments.sending} className="btn-sm">{d.comments.send}</SubmitButton>
      </div>
    </form>
  );
}
