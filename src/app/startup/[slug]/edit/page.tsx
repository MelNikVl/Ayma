import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTags } from "@/lib/queries";
import { updateStartup } from "@/app/actions/startup";
import { StartupForm } from "@/components/StartupForm";
import { ImageUploader } from "@/components/ImageUploader";
import { parseRoadmap } from "@/components/Roadmap";
import { canManageStartup } from "@/lib/access";
import { getI18n } from "@/i18n/server";
import { fill } from "@/i18n/format";
import { API_STATUSES, PAGE_FONTS, PAGE_LAYOUTS, PAGE_THEMES } from "@/lib/validation";
import { getStartupBySlug } from "../data";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.common.edit };
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export default async function EditStartupPage({ params, searchParams }: { params: { slug: string }; searchParams?: { tab?: string } }) {
  const { d } = getI18n();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/startup/${params.slug}/edit`);

  const startup = await getStartupBySlug(params.slug);
  if (!startup) notFound();
  if (!(await canManageStartup(user, startup.id))) notFound();

  const tags = await listTags();
  const num = (v: number | null) => (v === null || v === undefined ? "" : String(v));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{fill(d.form.editTitle, { name: startup.name })}</h1>
      <ImageUploader startupId={startup.id} name={startup.name} logoUrl={startup.logoUrl} coverUrl={startup.coverUrl} />
      <StartupForm
        hideImageUrls
        initialTab={(["main", "business", "api", "design"] as const).find((t) => t === searchParams?.tab) ?? "main"}
        action={updateStartup.bind(null, startup.id)}
        tags={tags}
        submitLabel={d.form.submitEdit}
        defaults={{
          name: startup.name,
          shortDesc: startup.shortDesc,
          fullDesc: startup.fullDesc,
          logoUrl: startup.logoUrl ?? "",
          coverUrl: startup.coverUrl ?? "",
          githubUrl: startup.githubUrl ?? "",
          demoUrl: startup.demoUrl ?? "",
          websiteUrl: startup.websiteUrl ?? "",
          tagIds: startup.tags.map((t) => t.id),
          preOrderEnabled: startup.preOrderEnabled,
          preOrderPrice: startup.preOrderPrice,
          preOrderGoal: startup.preOrderGoal,
          preOrderDesc: startup.preOrderDesc ?? "",
          paymentUrl: startup.paymentUrl ?? "",
          roadmap: parseRoadmap(startup.roadmap),
          advantages: startup.advantages ?? "",
          competitors: startup.competitors ?? "",
          implPrice: num(startup.implPrice),
          implDays: num(startup.implDays),
          fundingNeed: num(startup.fundingNeed),
          fundingNeedDesc: startup.fundingNeedDesc ?? "",
          walletAddress: startup.walletAddress ?? "",
          apiStatus: pick(startup.apiStatus, API_STATUSES, "NONE"),
          apiTypes: startup.apiTypes,
          apiDocsUrl: startup.apiDocsUrl ?? "",
          openToCollab: startup.openToCollab,
          collabNote: startup.collabNote ?? "",
          pageTheme: pick(startup.pageTheme, PAGE_THEMES, "default"),
          pageAccent: startup.pageAccent ?? "",
          pageFont: pick(startup.pageFont, PAGE_FONTS, "sans"),
          pageLayout: pick(startup.pageLayout, PAGE_LAYOUTS, "classic"),
        }}
      />
    </div>
  );
}
