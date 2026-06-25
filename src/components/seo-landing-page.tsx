import Link from "next/link";
import type { ReactNode } from "react";
import type { SeoLanding } from "@/lib/seo-landings";

/** Shape returned by DB after parsing JSON fields */
export type GuidePageData = {
  kind: string;
  slug: string;
  path: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  audience: string | null;
  keywords: string[];
  sections: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
  ctaLabel: string | null;
  ctaHref: string | null;
  related: string[];
};

export function SeoLandingPage({
  landing,
  children
}: {
  landing: SeoLanding | GuidePageData;
  children?: ReactNode;
}) {
  const faqItems = landing.faq;
  const ctaLabel = "cta" in landing ? landing.cta.label : landing.ctaLabel;
  const ctaHref = "cta" in landing ? landing.cta.href : landing.ctaHref;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <div className="space-y-5">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {landing.keywords.map((keyword, index) => (
            <span
              key={keyword}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                index % 3 === 0
                  ? "bg-red-50 text-hot"
                  : index % 3 === 1
                    ? "bg-sky-50 text-sky-700"
                    : "bg-teal-50 text-accent"
              }`}
            >
              {keyword}
            </span>
          ))}
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">{landing.h1}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-700">{landing.intro}</p>
        {landing.audience && <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{landing.audience}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          {ctaLabel && ctaHref && (
            <Link className="rounded-lg bg-hot px-4 py-2 text-sm font-medium text-white shadow-sm shadow-red-200 hover:bg-red-600" href={ctaHref}>
              {ctaLabel}
            </Link>
          )}
          <Link className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:border-sky hover:bg-sky-50" href="/cabinet">
            Написать материал
          </Link>
        </div>
      </section>

      {children}

      <section className="grid gap-3 md:grid-cols-2">
        {landing.sections.map((section) => (
          <article key={section.title} className="border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Вопросы и ответы</h2>
        <div className="mt-4 grid gap-3">
          {faqItems.map((item) => (
            <details key={item.question} className="border border-zinc-100 bg-zinc-50 p-4">
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Связанные страницы</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {landing.related.map((href) => (
            <Link key={href} href={href} className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:border-hot hover:text-hot">
              {href.replace("/", "").replaceAll("/", " / ")}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
