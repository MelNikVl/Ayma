import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/auth-helpers";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { GithubIcon } from "@/components/icons";

export const metadata = { title: "Вход" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Не удалось проверить данные Telegram. Попробуйте ещё раз.",
  github_disabled: "Вход через GitHub ещё не настроен на этом сервере.",
  github_state: "Сессия входа устарела. Нажмите «Войти через GitHub» ещё раз.",
  github_token: "GitHub не подтвердил вход. Попробуйте ещё раз.",
  github_profile: "Не удалось получить профиль GitHub. Попробуйте ещё раз.",
  github_taken: "Этот GitHub-аккаунт уже привязан к другому пользователю AYMA.",
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNext(searchParams.next);
  if (await getCurrentUser()) redirect(next);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const tgAuthUrl = `${env.appUrl}/api/auth/telegram?next=${encodeURIComponent(next)}`;
  const githubEnabled = Boolean(env.githubClientId);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-black text-white">A</div>
        <h1 className="mt-5 text-2xl font-bold">Вход в AYMA</h1>
        <p className="mt-2 text-sm text-muted">
          Разработчикам — через GitHub: так мы подтвердим, что проект ваш. Спонсорам подойдёт любой способ.
        </p>

        {searchParams.error && (
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {ERRORS[searchParams.error] ?? "Не получилось войти. Попробуйте ещё раз."}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {githubEnabled ? (
            <a
              href={`/api/auth/github?next=${encodeURIComponent(next)}`}
              className="btn w-full bg-[#24292F] py-3 text-white hover:bg-[#3a4048] dark:bg-white dark:text-[#24292F] dark:hover:bg-white/90"
            >
              <GithubIcon className="h-5 w-5" /> Войти через GitHub
            </a>
          ) : (
            <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
              Вход через GitHub не настроен (GITHUB_CLIENT_ID).
            </p>
          )}

          {botUsername && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-border" /> или <span className="h-px flex-1 bg-border" />
              </div>
              <TelegramLoginButton botUsername={botUsername} authUrl={tgAuthUrl} />
            </>
          )}
        </div>

        {env.devLoginEnabled && (
          <form action="/api/auth/dev" method="post" className="mt-8 space-y-3 border-t border-dashed border-border pt-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">Тестовый вход (только для разработки)</p>
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="label">Имя пользователя</span>
              <input name="username" placeholder="username" defaultValue="dev_user" className="input" />
            </label>
            <label className="block">
              <span className="label">GitHub-логин (имитация привязки)</span>
              <input name="githubLogin" placeholder="необязательно" className="input" />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="admin" className="accent-accent" /> Сделать администратором
            </label>
            <button type="submit" className="btn-secondary w-full">Войти без GitHub и Telegram</button>
          </form>
        )}
      </div>
    </div>
  );
}
