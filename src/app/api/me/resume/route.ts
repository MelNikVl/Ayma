import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { refreshUserScore } from "@/lib/score";
import { isPdf, MAX_PDF_BYTES, removeUploaded, saveImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

async function revalidate(user: { id: string; githubLogin: string | null }) {
  await refreshUserScore(user.id);
  revalidatePath("/dashboard");
  revalidatePath(`/u/${user.githubLogin ?? user.id}`);
}

/** Загрузка резюме (PDF до 5 МБ), multipart поле file. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "loginRequired" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: "fileMissing" }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) return NextResponse.json({ ok: false, message: "pdfTooBig" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(buf)) return NextResponse.json({ ok: false, message: "pdfOnly" }, { status: 400 });

  const prev = await prisma.user.findUnique({ where: { id: user.id }, select: { resumeUrl: true } });
  const url = await saveImage(`resume-${user.id}`, buf, "pdf");
  const name = (file.name || "resume.pdf").replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "resume.pdf";
  await prisma.user.update({ where: { id: user.id }, data: { resumeUrl: url, resumeName: name } });
  await removeUploaded(prev?.resumeUrl);
  await revalidate(user);
  return NextResponse.json({ ok: true, message: "uploaded", url, name });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, message: "loginRequired" }, { status: 401 });
  const prev = await prisma.user.findUnique({ where: { id: user.id }, select: { resumeUrl: true } });
  await removeUploaded(prev?.resumeUrl);
  await prisma.user.update({ where: { id: user.id }, data: { resumeUrl: null, resumeName: null } });
  await revalidate(user);
  return NextResponse.json({ ok: true, message: "removed", url: null });
}
