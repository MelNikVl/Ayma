import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatPrice } from "@/lib/format";
import { StartupLogo } from "@/components/StartupLogo";
import { SponsorForm } from "@/components/SponsorForm";
import { getStartupBySlug } from "../data";

export const metadata = { title: "Стать спонсором" };
export const dynamic = "force-dynamic";

export default async function SponsorPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { order?: string };
}) {
  const startup = await getStartupBySlug(params.slug);
  if (!startup || startup.status !== "APPROVED") notFound();

  const user = await getCurrentUser();
  const selfPath = `/startup/${startup.slug}/sponsor`;
  if (!user) redirect(`/login?next=${encodeURIComponent(selfPath)}`);

  // Экран успеха после оформления
  if (searchParams.order) {
    const order = await prisma.preOrder.findFirst({
      where: { id: searchParams.order, sponsorId: user.id, startupId: startup.id },
    });
    if (order) {
      return (
        <Shell startup={startup}>
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-2xl">✓</div>
            <h1 className="mt-4 text-xl font-bold">Предзаказ оформлен</h1>
            <p className="mt-2 text-sm text-muted">
              {order.quantity} × {formatPrice(startup.preOrderPrice)} = <b className="text-fg">{formatPrice(order.amount)}</b>
            </p>
            {order.paymentLink ? (
              <>
                <a href={order.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 w-full py-3">
                  Перейти к оплате
                </a>
                <p className="mt-3 text-xs text-muted">
                  Оплата идёт напрямую фаундеру. После оплаты он подтвердит её — и вы появитесь в списке спонсоров.
                </p>
              </>
            ) : (
              <p className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-sm">
                Фаундер получил уведомление и свяжется с вами по контакту <b>{order.contactInfo}</b>, чтобы договориться об оплате.
              </p>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <Link href={`/startup/${startup.slug}`} className="btn-secondary">К стартапу</Link>
              <Link href="/dashboard" className="btn-secondary">Мои предзаказы</Link>
            </div>
          </div>
        </Shell>
      );
    }
  }

  if (!startup.preOrderEnabled || startup.preOrderPrice <= 0) {
    return (
      <Shell startup={startup}>
        <p className="text-center text-sm text-muted">Фаундер пока не открыл предзаказ.</p>
      </Shell>
    );
  }

  if (startup.founderId === user.id) {
    return (
      <Shell startup={startup}>
        <p className="text-center text-sm text-muted">Это ваш стартап — оформить предзаказ у себя нельзя.</p>
      </Shell>
    );
  }

  return (
    <Shell startup={startup}>
      <div className="mb-5 rounded-lg bg-surface-2 p-4">
        <div className="text-xs uppercase tracking-wide text-muted">Вы получите</div>
        <p className="mt-1 whitespace-pre-line text-sm">{startup.preOrderDesc}</p>
        <div className="mt-2 text-sm">
          Цена за единицу: <b>{formatPrice(startup.preOrderPrice)}</b>
        </div>
      </div>
      <SponsorForm
        startupId={startup.id}
        price={startup.preOrderPrice}
        defaultContact={user.username ? `@${user.username}` : ""}
      />
    </Shell>
  );
}

function Shell({
  startup,
  children,
}: {
  startup: { name: string; slug: string; logoUrl: string | null; shortDesc: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <Link href={`/startup/${startup.slug}`} className="mb-4 inline-block text-sm text-muted hover:text-fg">
        ← {startup.name}
      </Link>
      <div className="card p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-border/60 pb-5">
          <StartupLogo name={startup.name} logoUrl={startup.logoUrl} size={48} />
          <div className="min-w-0">
            <div className="text-xs text-muted">Предзаказ услуги</div>
            <div className="truncate font-bold">{startup.name}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
