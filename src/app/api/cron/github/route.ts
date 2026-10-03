import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchRepoInfo, parseGithubUrl } from "@/lib/github";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Обновление звёзд и даты последнего коммита для всех одобренных стартапов.
 * Вызывать по расписанию: curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/github
 */
export async function GET(req: NextRequest) {
  const secret = env.cronSecret;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startups = await prisma.startup.findMany({
    where: { status: "APPROVED", githubUrl: { not: null } },
    select: { id: true, githubUrl: true },
    orderBy: { updatedAt: "asc" },
    take: 200,
  });

  let updated = 0;
  for (const s of startups) {
    const ref = parseGithubUrl(s.githubUrl);
    if (!ref) continue;
    const info = await fetchRepoInfo(ref, { fresh: true });
    if (!info) continue;
    await prisma.startup.update({
      where: { id: s.id },
      data: { githubStars: info.stars, githubLastCommit: info.pushedAt },
    });
    updated++;
  }

  revalidatePath("/");
  return NextResponse.json({ checked: startups.length, updated });
}
