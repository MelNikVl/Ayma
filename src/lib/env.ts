/** Централизованный доступ к переменным окружения с понятными ошибками. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Переменная окружения ${name} не задана. См. .env.example`);
  return value;
}

export const env = {
  get appUrl(): string {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get sessionSecret(): Uint8Array {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) throw new Error("SESSION_SECRET должен быть не короче 32 символов");
    return new TextEncoder().encode(secret);
  },
  get telegramBotToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN || undefined;
  },
  get adminTelegramIds(): Set<string> {
    return new Set(
      (process.env.ADMIN_TELEGRAM_IDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  },
  get githubClientId(): string | undefined {
    return process.env.GITHUB_CLIENT_ID || undefined;
  },
  get githubClientSecret(): string | undefined {
    return process.env.GITHUB_CLIENT_SECRET || undefined;
  },
  get adminGithubLogins(): Set<string> {
    return new Set(
      (process.env.ADMIN_GITHUB_LOGINS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  },
  get githubToken(): string | undefined {
    return process.env.GITHUB_TOKEN || undefined;
  },
  get autoApprove(): boolean {
    return process.env.AUTO_APPROVE === "true";
  },
  get devLoginEnabled(): boolean {
    if (process.env.ENABLE_DEV_LOGIN !== "true") return false;
    // В production dev-вход разрешается только явным флагом — для локального превью в Docker.
    return process.env.NODE_ENV !== "production" || process.env.DEV_LOGIN_ALLOW_PRODUCTION === "true";
  },
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET || undefined;
  },
};
