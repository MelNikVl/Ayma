import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST() {
  const res = NextResponse.redirect(new URL("/", env.appUrl), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
