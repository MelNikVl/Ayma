import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { recomputeStartupScores, recomputeUserScores } from "@/lib/score";

export const dynamic = "force-dynamic";

/** Полный пересчёт рейтингов (раз в час/сутки по cron): Authorization: Bearer $CRON_SECRET */
export async function GET(req: NextRequest) {
  const secret = env.cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const startups = await recomputeStartupScores();
  const users = await recomputeUserScores();
  revalidatePath("/", "layout");
  return NextResponse.json({ startups, users });
}
