import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/auth-helpers";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";

export const metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next);
  if (await getCurrentUser()) redirect(next);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const authUrl = `${env.appUrl}/api/auth/telegram?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-black text-white">A</div>
        <h1 className="mt-5 text-2xl font-bold">Вход в AYMA</h1>
        <p className="mt-2 text-sm text-muted">
          Один аккаунт Telegram — и для фаундеров, и для спонсоров. Пароли не нужны.
        </p>

        {searchParams.error && (
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            Не удалось проверить данные Telegram. Попробуйте ещё раз.
          </div>
        )}

        <div className="mt-8">
          {botUsername ? (
            <TelegramLoginButton botUsername={botUsername} authUrl={authUrl} />
          ) : (
            <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
              Не задан TELEGRAM_BOT_USERNAME — виджет входа недоступен.
            </p>
          )}
        </div>

        {env.devLoginEnabled && (
          <form action="/api/auth/dev" method="post" className="mt-8 space-y-3 border-t border-dashed border-border pt-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">Dev-вход (только для разработки)</p>
            <input type="hidden" name="next" value={next} />
            <input name="username" placeholder="username" defaultValue="dev_user" className="input" />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="admin" className="accent-accent" /> Сделать администратором
            </label>
            <button type="submit" className="btn-secondary w-full">Войти без Telegram</button>
          </form>
        )}
      </div>
    </div>
  );
}
