import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default function NotFound() {
  const { d } = getI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="text-6xl font-black text-accent">404</div>
      <h1 className="mt-4 text-xl font-bold">{d.notFound.title}</h1>
      <p className="mt-2 text-sm text-muted">{d.notFound.text}</p>
      <Link href="/" className="btn-primary mt-6">{d.notFound.home}</Link>
    </div>
  );
}
