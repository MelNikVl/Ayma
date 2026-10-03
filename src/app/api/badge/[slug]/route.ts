import { prisma } from "@/lib/prisma";
import { scoreColor } from "@/components/ScoreBadge";

export const dynamic = "force-dynamic";

/** Встраиваемый SVG-бейдж «AYMA ★ 72» для README и сайтов */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const startup = await prisma.startup.findUnique({
    where: { slug: params.slug },
    select: { score: true, votesCount: true, status: true },
  });
  const score = startup?.status === "APPROVED" ? startup.score : null;
  const right = score === null ? "n/a" : `★ ${score}`;
  const color = score === null ? "148 163 184" : scoreColor(score);
  const [r, g, b] = color.split(" ");
  const leftW = 52;
  const rightW = 14 + right.length * 7;
  const w = leftW + rightW;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="AYMA: ${right}">
<title>AYMA: ${right}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="c"><rect width="${w}" height="20" rx="4"/></clipPath>
<g clip-path="url(#c)"><rect width="${leftW}" height="20" fill="#0066FF"/><rect x="${leftW}" width="${rightW}" height="20" fill="rgb(${r},${g},${b})"/><rect width="${w}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="bold">
<text x="${leftW / 2}" y="14">AYMA</text><text x="${leftW + rightW / 2}" y="14">${right}</text></g></svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
  });
}
