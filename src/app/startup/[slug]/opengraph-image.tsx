import { prisma } from "@/lib/prisma";
import { getI18n } from "@/i18n/server";
import { fill, formatMoneyShort } from "@/i18n/format";
import { tTag } from "@/i18n/dictionaries";
import { OgFrame, gradientFor, ogImageSrc, renderOg, scoreHex } from "@/lib/og";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "AYMA";

export default async function Image({ params }: { params: { slug: string } }) {
  const { d, locale } = getI18n();
  const s = await prisma.startup.findUnique({
    where: { slug: params.slug },
    select: {
      fundingNeed: true,
      name: true, shortDesc: true, logoUrl: true, score: true, votesCount: true, status: true, pageAccent: true,
      preOrderEnabled: true, preOrderPrice: true, apiStatus: true, openToCollab: true,
      tags: { select: { name: true, color: true }, take: 4 },
    },
  });
  if (!s || s.status !== "APPROVED") {
    return renderOg(<OgFrame footer="ai-groundtruth.com"><div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>AYMA</div></OgFrame>);
  }
  const logo = await ogImageSrc(s.logoUrl);
  const [g1, g2] = gradientFor(s.name);
  const accent = s.pageAccent && /^#[0-9a-f]{6}$/i.test(s.pageAccent) ? s.pageAccent : "#0066FF";
  const name = s.name.length > 34 ? `${s.name.slice(0, 33)}…` : s.name;
  const desc = s.shortDesc.length > 120 ? `${s.shortDesc.slice(0, 119)}…` : s.shortDesc;
  const chips: { label: string; color: string }[] = [
    ...(s.apiStatus === "PUBLIC" || s.apiStatus === "BETA" ? [{ label: d.api.status[s.apiStatus], color: "#16A34A" }] : []),
    ...(s.openToCollab ? [{ label: d.card.collab, color: "#9333EA" }] : []),
    ...s.tags.map((t) => ({ label: tTag(d, t.name), color: t.color })),
  ].slice(0, 4);

  return renderOg(
    <OgFrame accent={accent} footer={
        (s.fundingNeed ?? 0) > 0
          ? fill(d.invest.seeking, { amount: formatMoneyShort(s.fundingNeed ?? 0, locale).replace("₸", locale === "en" ? "KZT" : "тг") })
          : d.meta.title
      }>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 40 }}>
        {logo ? (
          <img alt="" src={logo} width={168} height={168} style={{ borderRadius: 36, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              display: "flex", width: 168, height: 168, borderRadius: 36, alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg, ${g1}, ${g2})`, color: "white", fontSize: 84, fontWeight: 800,
            }}
          >
            {s.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#111113", lineHeight: 1.1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#4B4B55", marginTop: 18, lineHeight: 1.35 }}>{desc}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            {chips.map((c) => (
              <div key={c.label} style={{ display: "flex", fontSize: 22, fontWeight: 700, color: c.color, background: `${c.color}1F`, padding: "6px 14px", borderRadius: 10 }}>
                {c.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex", width: 132, height: 132, borderRadius: 999, alignItems: "center", justifyContent: "center",
              border: `10px solid ${scoreHex(s.score)}`, background: "white", fontSize: 50, fontWeight: 800, color: "#111113",
            }}
          >
            {s.score}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#6B6B73" }}>{d.score.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 700, color: "#111113" }}>
            <svg width="22" height="20" viewBox="0 0 22 20"><path d="M11 0 L22 20 L0 20 Z" fill={accent} /></svg>
            {s.votesCount}
          </div>
        </div>
      </div>
    </OgFrame>,
  );
}
