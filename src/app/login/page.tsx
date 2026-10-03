import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/auth-helpers";
import { getI18n } from "@/i18n/server";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { GithubIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.login.title };
}

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const { d } = getI18n();
  const next = safeNext(searchParams.next);
  if (await getCurrentUser()) redirect(next);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const tgAuthUrl = `${env.appUrl}/api/auth/telegram?next=${encodeURIComponent(next)}`;
  const githubEnabled = Boolean(env.githubClientId);

  return (
    <div className="hero-mesh">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-xl font-black text-white">A</div>
          <h1 className="mt-5 text-2xl font-bold">{d.login.title}</h1>
          <p className="mt-2 text-sm text-muted">{d.login.text}</p>

          {searchParams.error && (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {d.login.errors[searchParams.error] ?? d.login.errors.default}
            </div>
          )}

          <div className="mt-8 space-y-4">
            {githubEnabled ? (
              <a
                href={`/api/auth/github?next=${encodeURIComponent(next)}`}
                className="btn w-full bg-[#24292F] py-3 text-white hover:bg-[#3a4048] dark:bg-white dark:text-[#24292F] dark:hover:bg-white/90"
              >
                <GithubIcon className="h-5 w-5" /> {d.login.github}
              </a>
            ) : (
              <p className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">{d.login.githubOff}</p>
            )}
            {botUsername && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-border" /> {d.login.or} <span className="h-px flex-1 bg-border" />
                </div>
                <TelegramLoginButton botUsername={botUsername} authUrl={tgAuthUrl} />
              </>
            )}
          </div>

          {env.devLoginEnabled && (
            <form action="/api/auth/dev" method="post" className="mt-8 space-y-3 border-t border-dashed border-border pt-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">{d.login.dev}</p>
              <input type="hidden" name="next" value={next} />
              <label className="block">
                <span className="label">{d.login.devName}</span>
                <input name="username" placeholder="username" defaultValue="dev_user" className="input" />
              </label>
              <label className="block">
                <span className="label">{d.login.devGithub}</span>
                <input name="githubLogin" className="input" />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="admin" className="accent-accent" /> {d.login.devAdmin}
              </label>
              <button type="submit" className="btn-secondary w-full">{d.login.devSubmit}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
