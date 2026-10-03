import "server-only";
import path from "path";
import { readFile } from "fs/promises";
import { ImageResponse } from "next/og";
import { UPLOAD_DIR } from "./uploads";

export const OG_SIZE = { width: 1200, height: 630 };

type Weight = 400 | 700 | 800;
let fontsPromise: Promise<{ name: string; data: Buffer; weight: Weight; style: "normal" }[]> | null = null;

/** Noto Sans с кириллицей и казахскими буквами (подмножества latin, cyrillic, cyrillic-ext) */
function loadFonts() {
  fontsPromise ??= Promise.all(
    ([400, 700, 800] as Weight[]).flatMap((weight) =>
      ["latin", "cyrillic", "cyrillic-ext"].map(async (subset) => ({
        name: "Noto Sans",
        data: await readFile(path.join(process.cwd(), "public", "fonts", `noto-sans-${subset}-${weight}.woff`)),
        weight,
        style: "normal" as const,
      })),
    ),
  );
  return fontsPromise;
}

/** Картинка для og:image: загруженный файл → data URI, внешний URL — как есть */
export async function ogImageSrc(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("/uploads/")) {
    const name = url.slice("/uploads/".length);
    if (!/^[\w-]+\.(png|jpg|webp|gif)$/.test(name)) return null;
    if (name.endsWith(".webp")) return null; // satori не умеет webp
    try {
      const buf = await readFile(path.join(UPLOAD_DIR, name));
      const mime = name.endsWith(".png") ? "image/png" : name.endsWith(".gif") ? "image/gif" : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  }
  if (/^https:\/\/avatars\.githubusercontent\.com\//.test(url)) return url;
  return /^https?:\/\/.+\.(png|jpe?g|gif)(\?.*)?$/i.test(url) ? url : null;
}

export async function renderOg(node: React.ReactElement): Promise<ImageResponse> {
  return new ImageResponse(node, { ...OG_SIZE, fonts: await loadFonts() });
}

const GRADIENTS = [
  ["#0066FF", "#00C2FF"],
  ["#7C3AED", "#C084FC"],
  ["#DB2777", "#F472B6"],
  ["#EA580C", "#FBBF24"],
  ["#059669", "#34D399"],
  ["#0F172A", "#475569"],
];
export function gradientFor(name: string): [string, string] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (GRADIENTS[h % GRADIENTS.length] ?? ["#0066FF", "#00C2FF"]) as [string, string];
}

export function scoreHex(score: number): string {
  if (score >= 80) return "#F59E0B";
  if (score >= 60) return "#A855F7";
  if (score >= 40) return "#22C55E";
  if (score >= 20) return "#0EA5E9";
  return "#94A3B8";
}

/** Общая рамка картинки: фон, бренд AYMA внизу */
export function OgFrame({ accent = "#0066FF", children, footer }: { accent?: string; children: React.ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F5F5F7",
        fontFamily: "Noto Sans",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", height: 14, background: accent }} />
      <div style={{ display: "flex", flex: 1, padding: "56px 72px 0", flexDirection: "column" }}>{children}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 72px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#0066FF",
              color: "white",
              fontSize: 30,
              fontWeight: 800,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            A
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: "#111113" }}>AYMA</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#6B6B73" }}>{footer}</div>
      </div>
    </div>
  );
}
