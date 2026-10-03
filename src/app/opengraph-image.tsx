import { prisma } from "@/lib/prisma";
import { getI18n } from "@/i18n/server";
import { formatNumber } from "@/i18n/format";
import { OgFrame, renderOg } from "@/lib/og";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "AYMA";

export default async function Image() {
  const { d, locale } = getI18n();
  const [projects, devs] = await Promise.all([
    prisma.startup.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { memberships: { some: {} } } }),
  ]);
  return renderOg(
    <OgFrame footer="ai-groundtruth.com">
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#111113", lineHeight: 1.05, maxWidth: 980 }}>{d.home.heroTitle}</div>
        <div style={{ display: "flex", fontSize: 30, color: "#4B4B55", marginTop: 24, maxWidth: 980, lineHeight: 1.35 }}>{d.home.heroText}</div>
        <div style={{ display: "flex", gap: 56, marginTop: 40 }}>
          {[
            [projects, d.home.statProjects],
            [devs, d.home.statDevelopers],
          ].map(([n, label]) => (
            <div key={String(label)} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#0066FF" }}>{formatNumber(Number(n), locale)}</div>
              <div style={{ display: "flex", fontSize: 24, color: "#6B6B73" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </OgFrame>,
  );
}
