"use client";

import { useFormState } from "react-dom";
import { respondToJob } from "@/app/actions/jobs";
import { useI18n } from "@/i18n/client";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

export function JobRespondForm({ jobId, myStartups }: { jobId: string; myStartups: { id: string; name: string }[] }) {
  const { d } = useI18n();
  const t = d.jobs;
  const [state, action] = useFormState(respondToJob, { ok: false });
  if (state.ok) return <FormMessage ok message={state.message} />;
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      {state.message && <FormMessage ok={false} message={state.message} />}
      <input type="hidden" name="jobId" value={jobId} />
      <label className="block">
        <span className="label">{t.rMessage}</span>
        <textarea name="message" rows={5} required minLength={20} maxLength={2000} className="input" placeholder={t.rMessagePh} />
        <FieldError errors={e.message} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">{t.rPrice}</span>
          <input name="price" type="number" min={0} step={10000} inputMode="numeric" className="input tabular-nums" />
          <FieldError errors={e.price} />
        </label>
        <label className="block">
          <span className="label">{t.rDays}</span>
          <input name="days" type="number" min={1} max={365} inputMode="numeric" className="input tabular-nums" />
          <FieldError errors={e.days} />
        </label>
      </div>
      {myStartups.length > 0 && (
        <label className="block">
          <span className="label">{t.rFrom}</span>
          <select name="startupId" className="input" defaultValue={myStartups[0]?.id}>
            <option value="">{t.rFromMe}</option>
            {myStartups.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}
      <SubmitButton pendingText={t.rSending} className="w-full py-2.5">{t.rSend}</SubmitButton>
    </form>
  );
}
