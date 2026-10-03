import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/i18n/server";
import { fill, formatPrice } from "@/i18n/format";
import { StartupLogo } from "@/components/StartupLogo";
import { SponsorForm } from "@/components/SponsorForm";
import { getStartupBySlug } from "../data";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return { title: getI18n().d.sponsorPage.title };
}

export default async function SponsorPage({ params, searchParams }: { params: { slug: string }; searchParams: { order?: string } }) {
  const { d, locale } = getI18n();
  const startup = await getStartupBySlug(params.slug);
  if (!startup || startup.status !== "APPROVED") notFound();

  const user = await getCurrentUser();
  const selfPath = `/startup/${startup.slug}/sponsor`;
  if (!user) redirect(`/login?next=${encodeURIComponent(selfPath)}`);

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <Link href={`/startup/${startup.slug}`} className="mb-4 inline-block text-sm text-muted hover:text-fg">← {startup.name}</Link>
      <div className="card p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-border/60 pb-5">
          <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={48} />
          <div className="min-w-0">
            <div className="text-xs text-muted">{d.sponsorPage.preorder}</div>
            <div className="truncate font-bold">{startup.name}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (searchParams.order) {
    const order = await prisma.preOrder.findFirst({ where: { id: searchParams.order, sponsorId: user.id, startupId: startup.id } });
    if (order) {
      const contact = order.contactInfo ?? "";
      return shell(
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-2xl">✓</div>
          <h1 className="mt-4 text-xl font-bold">{d.sponsorPage.successTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            {order.quantity} × {formatPrice(startup.preOrderPrice, locale)} = <b className="text-fg">{formatPrice(order.amount, locale)}</b>
          </p>
          {order.paymentLink ? (
            <>
              <a href={order.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 w-full py-3">{d.sponsorPage.pay}</a>
              <p className="mt-3 text-xs text-muted">{d.sponsorPage.payHint}</p>
            </>
          ) : (
            <p className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-sm">
              {fill(startup.members.length > 0 ? d.sponsorPage.teamNotified : d.sponsorPage.teamUnclaimed, { contact })}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Link href={`/startup/${startup.slug}`} className="btn-secondary">{d.sponsorPage.toProject}</Link>
            <Link href="/dashboard" className="btn-secondary">{d.sponsorPage.myOrders}</Link>
          </div>
        </div>,
      );
    }
  }

  if (!startup.preOrderEnabled || startup.preOrderPrice <= 0) return shell(<p className="text-center text-sm text-muted">{d.sponsorPage.closed}</p>);
  if (startup.members.some((m) => m.userId === user.id)) return shell(<p className="text-center text-sm text-muted">{d.sponsorPage.own}</p>);

  return shell(
    <>
      <div className="mb-5 rounded-lg bg-surface-2 p-4">
        <div className="text-xs uppercase tracking-wide text-muted">{d.sponsorPage.youGet}</div>
        <p className="mt-1 whitespace-pre-line text-sm">{startup.preOrderDesc}</p>
        <div className="mt-2 text-sm">{fill(d.sponsorPage.unitPrice, { price: formatPrice(startup.preOrderPrice, locale) })}</div>
      </div>
      <SponsorForm startupId={startup.id} price={startup.preOrderPrice} defaultContact={user.username ? `@${user.username}` : ""} />
    </>,
  );
}
