import { getI18n } from "@/i18n/server";

export function generateMetadata() {
  return { title: getI18n().d.terms.title };
}

export default function TermsPage() {
  const { d } = getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <article className="card prose-md p-6 sm:p-10">
        <h1>{d.terms.title}</h1>
        <p className="text-muted">{d.terms.note}</p>
        {d.terms.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
