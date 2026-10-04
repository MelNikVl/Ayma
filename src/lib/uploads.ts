import "server-only";
import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";
import { randomBytes } from "crypto";

/** Каталог для загруженных файлов (в Docker — volume /app/uploads). */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
export const UPLOAD_URL_PREFIX = "/uploads/";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Все типы, которые отдаёт /uploads/[file] */
export const UPLOAD_TYPES: Record<string, string> = { ...IMAGE_TYPES, pdf: "application/pdf" };

/** PDF по сигнатуре «%PDF-» */
export function isPdf(buf: Buffer): boolean {
  return buf.length > 8 && buf.toString("ascii", 0, 5) === "%PDF-";
}

/** Тип картинки по сигнатуре файла (расширению и Content-Type клиента не доверяем). SVG не принимаем. */
export function detectImageType(buf: Buffer): keyof typeof IMAGE_TYPES | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "gif";
  return null;
}

export async function saveImage(prefix: string, buf: Buffer, ext: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${prefix.replace(/[^\w-]/g, "")}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return UPLOAD_URL_PREFIX + name;
}

/** Удаляет ранее загруженный файл, если url указывает на наш каталог. */
export async function removeUploaded(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(UPLOAD_URL_PREFIX)) return;
  const name = url.slice(UPLOAD_URL_PREFIX.length);
  if (!/^[\w-]+\.(png|jpg|webp|gif|pdf)$/.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => undefined);
}
