"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ClaimState } from "@/app/actions/team";
import { SubmitButton } from "./SubmitButton";

type Action = (prev: ClaimState, formData: FormData) => Promise<ClaimState>;

export function ClaimForm({ action, hasGithub }: { action: Action; hasGithub: boolean }) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return <p className="rounded-lg bg-success/10 px-4 py-3 text-sm">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      {state.message && <p className="rounded-lg bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</p>}
      {open && (
        <label className="block">
          <span className="label">Комментарий для команды или модератора</span>
          <textarea
            name="message"
            rows={2}
            maxLength={500}
            className="input"
            placeholder="Например: я делал фронтенд, коммиты с рабочего ноутбука под другим email"
          />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="Проверяем GitHub…">Это мой проект</SubmitButton>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm text-muted">
            Добавить комментарий
          </button>
        )}
      </div>
      <p className="hint">
        {hasGithub
          ? "Сверим ваш GitHub-логин с авторами коммитов репозитория. Нашли — добавим сразу, нет — отправим заявку команде."
          : "Вы вошли без GitHub, поэтому подтвердить авторство автоматически не получится — уйдёт заявка на проверку."}
      </p>
    </form>
  );
}
