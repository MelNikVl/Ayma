import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { safeNext, upsertTelegramUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

/**
 * Dev-вход без Telegram (только при ENABLE_DEV_LOGIN=true и NODE_ENV !== production).
 * Telegram Login Widget не работает на localhost, поэтому для локальной разработки нужен обходной путь.
 */
export async function POST(req: NextRequest) {
  if (!env.devLoginEnabled) return new NextResponse("Not found", { status: 404 });

  const form = await req.formData();
  const username = String(form.get("username") || "dev_user").replace(/[^\w]/g, "").slice(0, 32) || "dev_user";
  // детерминированный фейковый telegramId из username
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const fakeId = String(9_000_000_000 + hash);

  const user = await upsertTelegramUser({ id: fakeId, username, firstName: username });
  const { prisma } = await import("@/lib/prisma");
  const githubLogin = String(form.get("githubLogin") || "").replace(/[^\w-]/g, "").slice(0, 39);
  if (githubLogin) await prisma.user.update({ where: { id: user.id }, data: { githubLogin } });
  if (form.get("admin") === "on") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  const res = NextResponse.redirect(new URL(safeNext(String(form.get("next") ?? "/")), env.appUrl), {
    status: 303,
  });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions());
  return res;
}
