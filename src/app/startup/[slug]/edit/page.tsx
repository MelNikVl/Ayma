import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTags } from "@/lib/queries";
import { updateStartup } from "@/app/actions/startup";
import { StartupForm } from "@/components/StartupForm";
import { getStartupBySlug } from "../data";

export const metadata = { title: "Редактирование" };
export const dynamic = "force-dynamic";

export default async function EditStartupPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/startup/${params.slug}/edit`);

  const startup = await getStartupBySlug(params.slug);
  if (!startup) notFound();
  if (startup.founderId !== user.id && user.role !== "ADMIN") notFound();

  const tags = await listTags();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Редактирование: {startup.name}</h1>
      <StartupForm
        action={updateStartup.bind(null, startup.id)}
        tags={tags}
        submitLabel="Сохранить изменения"
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
        }}
      />
    </div>
  );
}
