import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeNext, upsertGithubUser, GITHUB_STATE_COOKIE, type GithubProfile } from "@/lib/auth-helpers";
import { createSessionToken, getCurrentUser, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

function fail(reason: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${reason}`, env.appUrl));
  res.cookies.delete(GITHUB_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(GITHUB_STATE_COOKIE)?.value ?? "{}");
  } catch {
    /* повреждённая cookie — считаем, что state не совпал */
  }
  if (!code || !state || state !== saved.state) return fail("github_state");
  if (!env.githubClientId || !env.githubClientSecret) return fail("github_disabled");

  // 1. code → access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: `${env.appUrl}/api/auth/github/callback`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const tokenJson = (await tokenRes?.json().catch(() => null)) as { access_token?: string } | null;
  if (!tokenJson?.access_token) return fail("github_token");

  // 2. профиль пользователя (токен дальше не храним)
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ayma",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const gh = (await userRes?.json().catch(() => null)) as GithubProfile | null;
  if (!gh?.id || !gh.login) return fail("github_profile");

  const current = await getCurrentUser();
  const result = await upsertGithubUser(gh, current?.id ?? null);
  if ("error" in result) return fail(result.error);

  const res = NextResponse.redirect(new URL(safeNext(saved.next), env.appUrl));
  res.cookies.delete(GITHUB_STATE_COOKIE);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(result.id), sessionCookieOptions());
  return res;
}
