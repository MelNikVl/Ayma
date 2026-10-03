import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";

export const SESSION_COOKIE = "aim_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 дней

/** Безопасное для передачи в клиентские компоненты представление пользователя (без BigInt). */
export type SessionUser = Pick<User, "id" | "username" | "firstName" | "avatarUrl" | "role">;

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(env.sessionSecret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

async function readUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, env.sessionSecret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Текущий пользователь (кэшируется на время одного запроса). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readUserId();
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, firstName: true, avatarUrl: true, role: true },
  });
});

export class AuthError extends Error {}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Требуется вход через Telegram");
  return user;
}
