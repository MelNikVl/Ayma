import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getI18n } from "@/i18n/server";
import { JobForm } from "@/components/JobForm";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.jobs.newTitle };
}

export default async function NewJobPage({ searchParams }: { searchParams: { title?: string } }) {
  const { d } = getI18n();
  const user = await getCurrentUser();
  const title = (searchParams.title ?? "").slice(0, 120);

  if (!user) {
    const next = `/jobs/new${title ? `?title=${encodeURIComponent(title)}` : ""}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <div className="text-4xl">📝</div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{d.jobs.loginTitle}</h1>
        <p className="mt-2 text-muted">{d.jobs.loginText}</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary mt-6 px-6 py-3">{d.jobs.login}</Link>
      </div>
    );
  }

  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { company: true, username: true, telegramId: true } });
  const tg = profile?.username && profile.telegramId && profile.telegramId > 0n ? `@${profile.username}` : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/business" className="text-sm text-muted hover:text-fg">← {d.biz.campBiz}</Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{d.jobs.newTitle}</h1>
      <p className="mb-6 mt-2 text-muted">{d.jobs.newText}</p>
      <JobForm defaultTitle={title} defaultCompany={profile?.company ?? ""} defaultContact={tg} />
    </div>
  );
}
