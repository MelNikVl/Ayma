import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canManageStartup } from "@/lib/access";
import { detectImageType, MAX_IMAGE_BYTES, removeUploaded, saveImage } from "@/lib/uploads";
import { refreshScores } from "@/lib/score";

export const dynamic = "force-dynamic";

type Kind = "logo" | "cover";
const FIELD: Record<Kind, "logoUrl" | "coverUrl"> = { logo: "logoUrl", cover: "coverUrl" };

function kindOf(req: Request): Kind {
  return new URL(req.url).searchParams.get("kind") === "cover" ? "cover" : "logo";
}

async function load(id: string) {
  const user = await getCurrentUser();
  if (!user || !(await canManageStartup(user, id))) return { error: NextResponse.json({ ok: false, message: "noRights" }, { status: 403 }) };
  const startup = await prisma.startup.findUnique({ where: { id }, select: { slug: true, logoUrl: true, coverUrl: true } });
  if (!startup) return { error: NextResponse.json({ ok: false, message: "notFound" }, { status: 404 }) };
  return { startup };
}

async function finish(id: string, slug: string, body: { ok: boolean; message: string; url: string | null }) {
  await refreshScores(id);
  revalidatePath(`/startup/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  return NextResponse.json(body);
}

/** Загрузка логотипа (?kind=logo) или обложки (?kind=cover), multipart поле file. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const kind = kindOf(req);
  const res = await load(params.id);
  if ("error" in res) return res.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: "fileMissing" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ ok: false, message: "fileTooBig" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectImageType(buf);
  if (!ext) return NextResponse.json({ ok: false, message: "fileType" }, { status: 400 });

  const url = await saveImage(`${params.id}-${kind}`, buf, ext);
  await removeUploaded(res.startup[FIELD[kind]]);
  await prisma.startup.update({ where: { id: params.id }, data: { [FIELD[kind]]: url } });
  return finish(params.id, res.startup.slug, { ok: true, message: "uploaded", url });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const kind = kindOf(req);
  const res = await load(params.id);
  if ("error" in res) return res.error;
  await removeUploaded(res.startup[FIELD[kind]]);
  await prisma.startup.update({ where: { id: params.id }, data: { [FIELD[kind]]: null } });
  return finish(params.id, res.startup.slug, { ok: true, message: "removed", url: null });
}
