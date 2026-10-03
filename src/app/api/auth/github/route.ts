import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { env } from "@/lib/env";
import { safeNext, GITHUB_STATE_COOKIE } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";



/** Начало входа через GitHub (OAuth App). */
export async function GET(req: NextRequest) {
  const clientId = env.githubClientId;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=github_disabled", env.appUrl));

  const state = randomBytes(16).toString("hex");
  const next = safeNext(req.nextUrl.searchParams.get("next"));

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${env.appUrl}/api/auth/github/callback`);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");

  const res = NextResponse.redirect(url);
  res.cookies.set(GITHUB_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
