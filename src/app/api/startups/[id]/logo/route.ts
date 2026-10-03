import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canManageStartup } from "@/lib/access";
import { detectImageType, MAX_IMAGE_BYTES, removeUploaded, saveImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

function done(slug: string, body: { ok: boolean; message: string; logoUrl?: string | null }, status = 200) {
  revalidatePath(`/startup/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
  return NextResponse.json(body, { status });
}

/** Загрузка логотипа проекта (multipart/form-data, поле logo). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !(await canManageStartup(user, params.id))) {
    return NextResponse.json({ ok: false, message: "Менять логотип могут только участники команды проекта" }, { status: 403 });
  }
  const startup = await prisma.startup.findUnique({ where: { id: params.id }, select: { slug: true, logoUrl: true } });
  if (!startup) return NextResponse.json({ ok: false, message: "Проект не найден" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, message: "Выберите файл картинки" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, message: "Файл больше 2 МБ — уменьшите картинку" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectImageType(buf);
  if (!ext) return NextResponse.json({ ok: false, message: "Поддерживаются PNG, JPG, WebP и GIF" }, { status: 400 });

  const url = await saveImage(params.id, buf, ext);
  await removeUploaded(startup.logoUrl);
  await prisma.startup.update({ where: { id: params.id }, data: { logoUrl: url } });
  return done(startup.slug, { ok: true, message: "Логотип обновлён", logoUrl: url });
}

/** Удаление логотипа. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !(await canManageStartup(user, params.id))) {
    return NextResponse.json({ ok: false, message: "Нет прав" }, { status: 403 });
  }
  const startup = await prisma.startup.findUnique({ where: { id: params.id }, select: { slug: true, logoUrl: true } });
  if (!startup) return NextResponse.json({ ok: false, message: "Проект не найден" }, { status: 404 });
  await removeUploaded(startup.logoUrl);
  await prisma.startup.update({ where: { id: params.id }, data: { logoUrl: null } });
  return done(startup.slug, { ok: true, message: "Логотип удалён", logoUrl: null });
}
