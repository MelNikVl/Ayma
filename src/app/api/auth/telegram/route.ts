import { NextResponse, type NextRequest } from "next/server";
import { verifyTelegramAuth } from "@/lib/telegram";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { safeNext, upsertTelegramUser } from "@/lib/auth-helpers";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Callback Telegram Login Widget (data-auth-url). */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const next = safeNext(params.get("next"));

  const data = verifyTelegramAuth(params);
  if (!data) {
    return NextResponse.redirect(new URL("/login?error=invalid", env.appUrl));
  }

  const user = await upsertTelegramUser({
    id: data.id,
    username: data.username,
    firstName: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
    avatarUrl: data.photo_url,
  });

  const res = NextResponse.redirect(new URL(next, env.appUrl));
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions());
  return res;
}
