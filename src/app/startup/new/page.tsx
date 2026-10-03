import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listTags } from "@/lib/queries";
import { createStartup } from "@/app/actions/startup";
import { StartupForm, emptyStartupDefaults } from "@/components/StartupForm";
import { getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.form.newTitle };
}

export default async function NewStartupPage() {
  const { d } = getI18n();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/startup/new");
  const tags = await listTags();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{d.form.newTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">{d.form.newText}</p>
      <StartupForm action={createStartup} tags={tags} defaults={emptyStartupDefaults} submitLabel={d.form.submitNew} />
    </div>
  );
}
