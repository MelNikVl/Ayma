"use client";

import { useFormState } from "react-dom";
import { updateProfile } from "@/app/actions/profile";
import { useI18n } from "@/i18n/client";
import { SubmitButton } from "./SubmitButton";
import { FieldError } from "./FieldError";
import { FormMessage } from "./FormMessage";

export function ProfileForm({
  defaults,
}: {
  defaults: { firstName: string; bio: string; skills: string; contactUrl: string; linkedinUrl: string; openToCollab: boolean };
}) {
  const { d } = useI18n();
  const [state, action] = useFormState(updateProfile, { ok: false });
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage ok={state.ok} message={state.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">{d.dashboard.displayName}</span>
          <input name="firstName" defaultValue={defaults.firstName} maxLength={60} className="input" />
          <FieldError errors={e.firstName} />
        </label>
        <label className="block">
          <span className="label">{d.dashboard.contactUrl}</span>
          <input name="contactUrl" type="url" defaultValue={defaults.contactUrl} className="input" placeholder={d.dashboard.contactUrlPh} />
          <FieldError errors={e.contactUrl} />
        </label>
      </div>
      <label className="block">
        <span className="label">LinkedIn</span>
        <input name="linkedinUrl" type="url" defaultValue={defaults.linkedinUrl} className="input" placeholder="https://www.linkedin.com/in/…" />
        <FieldError errors={e.linkedinUrl} />
      </label>
      <label className="block">
        <span className="label">{d.dashboard.bio}</span>
        <textarea name="bio" defaultValue={defaults.bio} rows={3} maxLength={300} className="input" placeholder={d.dashboard.bioPh} />
        <FieldError errors={e.bio} />
      </label>
      <label className="block">
        <span className="label">{d.dashboard.skills}</span>
        <input name="skills" defaultValue={defaults.skills} className="input" placeholder={d.dashboard.skillsPh} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="openToCollab" defaultChecked={defaults.openToCollab} className="h-4 w-4 accent-accent" />
        {d.dashboard.openToCollab}
      </label>
      <SubmitButton>{d.dashboard.saveProfile}</SubmitButton>
    </form>
  );
}
