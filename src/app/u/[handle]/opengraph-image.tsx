import { prisma } from "@/lib/prisma";
import { getI18n } from "@/i18n/server";
import { levelFor } from "@/lib/levels";
import { OgFrame, ogImageSrc, renderOg, scoreHex } from "@/lib/og";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "AYMA";

export default async function Image({ params }: { params: { handle: string } }) {
  const { d } = getI18n();
  const h = decodeURIComponent(params.handle);
  const u =
    (await prisma.user.findFirst({ where: { githubLogin: { equals: h, mode: "insensitive" } } })) ??
    (await prisma.user.findUnique({ where: { id: h } }));
  if (!u) return renderOg(<OgFrame footer="ai-groundtruth.com"><div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>AYMA</div></OgFrame>);
  const avatar = await ogImageSrc(u.avatarUrl ?? null).catch(() => null);
  const name = u.firstName ?? u.username ?? "AYMA";
  return renderOg(
    <OgFrame footer={u.githubLogin ? `github.com/${u.githubLogin}` : "ai-groundtruth.com"}>
      <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
        {avatar ? (
          <img alt="" src={avatar} width={180} height={180} style={{ borderRadius: 999 }} />
        ) : (
          <div style={{ display: "flex", width: 180, height: 180, borderRadius: 999, background: "#0066FF", color: "white", fontSize: 90, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#111113" }}>{name}</div>
          {u.bio && <div style={{ display: "flex", fontSize: 28, color: "#4B4B55", marginTop: 14, lineHeight: 1.35 }}>{u.bio.slice(0, 120)}</div>}
          {u.skills.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              {u.skills.slice(0, 6).map((s) => (
                <div key={s} style={{ display: "flex", fontSize: 22, background: "white", padding: "6px 14px", borderRadius: 10, color: "#111113" }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", width: 132, height: 132, borderRadius: 999, alignItems: "center", justifyContent: "center", border: `10px solid ${scoreHex(u.score)}`, background: "white", fontSize: 50, fontWeight: 800 }}>
            {u.score}
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: scoreHex(u.score) }}>{d.score.levels[levelFor(u.score)]}</div>
        </div>
      </div>
    </OgFrame>,
  );
}
