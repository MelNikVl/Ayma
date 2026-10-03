import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

export interface TelegramAuthData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24; // данные виджета валидны сутки

/**
 * Проверка подписи данных Telegram Login Widget.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(params: URLSearchParams): TelegramAuthData | null {
  const botToken = env.telegramBotToken;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN не задан");

  const hash = params.get("hash");
  const id = params.get("id");
  const authDate = params.get("auth_date");
  if (!hash || !id || !authDate) return null;

  const allowed = ["auth_date", "first_name", "id", "last_name", "photo_url", "username"];
  const dataCheckString = allowed
    .filter((key) => params.has(key))
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const age = Math.floor(Date.now() / 1000) - Number(authDate);
  if (!Number.isFinite(age) || age > MAX_AUTH_AGE_SECONDS || age < -300) return null;

  return {
    id,
    auth_date: authDate,
    hash,
    first_name: params.get("first_name") ?? undefined,
    last_name: params.get("last_name") ?? undefined,
    username: params.get("username") ?? undefined,
    photo_url: params.get("photo_url") ?? undefined,
  };
}

/** Отправка сообщения пользователю от имени бота. Ошибки не пробрасываются — уведомления best-effort. */
export async function sendTelegramMessage(chatId: bigint | string | null | undefined, text: string): Promise<void> {
  const botToken = env.telegramBotToken;
  // нет бота, нет Telegram у пользователя или служебный аккаунт (отрицательный id)
  if (!botToken || chatId === null || chatId === undefined || BigInt(chatId) <= 0n) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn("[telegram] не удалось отправить уведомление:", error);
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
