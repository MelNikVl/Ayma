"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { refreshScores } from "@/lib/score";

export type VoteResult = { ok: boolean; voted: boolean; count: number; needLogin?: boolean };

/** Поставить или снять голос за проект. */
export async function toggleVote(startupId: string): Promise<VoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, voted: false, count: 0, needLogin: true };

  const startup = await prisma.startup.findUnique({ where: { id: startupId }, select: { id: true, slug: true, status: true } });
  if (!startup || startup.status !== "APPROVED") return { ok: false, voted: false, count: 0 };

  const existing = await prisma.vote.findUnique({
    where: { userId_startupId: { userId: user.id, startupId } },
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.vote.delete({ where: { userId_startupId: { userId: user.id, startupId } } });
    } else {
      await tx.vote.create({ data: { userId: user.id, startupId } });
    }
    const count = await tx.vote.count({ where: { startupId } });
    await tx.startup.update({ where: { id: startupId }, data: { votesCount: count } });
    return count;
  });

  await refreshScores(startupId);
  revalidatePath(`/startup/${startup.slug}`);
  revalidatePath("/rating");
  return { ok: true, voted: !existing, count: updated };
}
