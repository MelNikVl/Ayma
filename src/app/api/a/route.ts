import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|telegrambot|whatsapp|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

function clip(v: unknown, n: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null;
}

/**
 * Приём просмотров страниц. Cookies не ставим, IP не храним:
 * посетитель — sha256(день + IP + User-Agent + секрет), обрезанный до 32 символов.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const path = clip(body.p, 300);
  if (!path || !path.startsWith("/") || path.startsWith("/api/")) return new NextResponse(null, { status: 204 });

  let referrer: string | null = null;
  const ref = clip(body.r, 500);
  if (ref) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./, "");
      const own = new URL(env.appUrl).hostname.replace(/^www\./, "");
      referrer = host && host !== own ? host.slice(0, 200) : null;
    } catch {
      referrer = null;
    }
  }

  const ip =
    req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.ip ?? "0";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256").update(`${day}|${ip}|${ua}|${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 32);

  await prisma.pageView
    .create({
      data: {
        path,
        referrer,
        utmSource: clip(body.us, 100),
        utmMedium: clip(body.um, 100),
        utmCampaign: clip(body.uc, 100),
        visitor,
        locale: clip(body.l, 5),
        device: /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop",
      },
    })
    .catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
