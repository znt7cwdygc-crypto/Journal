import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseGuide } from "@/lib/guide-helpers";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "guide", isPublished: true } });
  if (!guide) return { title: "Гайд не найден", robots: { index: false, follow: false } };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: guide.path },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: guide.path,
      type: "article"
    }
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const raw = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "guide", isPublished: true } });
  if (!raw) notFound();

  const guide = parseGuide(raw);
  const updatedAt = raw.updatedAt;

  return (
    <div className="space-y-6">
      {/* Breadcrumb JSON-LD */}
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl("/").toString() },
          { "@type": "ListItem", "position": 2, "name": "Гайды", "item": siteUrl("/guides").toString() },
          { "@type": "ListItem", "position": 3, "name": guide.title }
        ]
      }) }} />

      {/* FAQ JSON-LD */}
      {guide.faq.length > 0 && (
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": guide.faq.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": { "@type": "Answer", "text": item.answer }
          }))
        }) }} />
      )}

      {/* Breadcrumb nav */}
      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-700">Главная</Link>
        <span className="mx-1">→</span>
        <Link href="/guides" className="hover:text-zinc-700">Гайды</Link>
        <span className="mx-1">→</span>
        <span className="text-zinc-900">{guide.title}</span>
      </nav>

      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {guide.category && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {guide.category}
            </span>
          )}
          {guide.audience && (
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
              {guide.audience}
            </span>
          )}
        </div>
        <h1 className="page-title">{guide.h1}</h1>
        <p className="text-sm text-zinc-500">
          Обновлено: {updatedAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {/* Intro */}
      <p className="body-copy">{guide.intro}</p>

      {/* Quick Answer */}
      {guide.quickAnswer && (
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-teal-800">Коротко</h2>
          <p className="text-sm leading-relaxed text-teal-900">{guide.quickAnswer}</p>
        </section>
      )}

      {/* Sections */}
      {guide.sections.map((section, i) => (
        <section key={i} className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">{section.title}</h2>
          <div className="body-copy whitespace-pre-line">{section.body}</div>
        </section>
      ))}

      {/* Checklist */}
      {guide.checklist.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">Чеклист</h2>
          <ul className="space-y-1.5">
            {guide.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mistakes */}
      {guide.mistakes.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="text-lg font-semibold text-amber-900">Частые ошибки</h2>
          <ul className="space-y-1.5">
            {guide.mistakes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="mt-0.5 shrink-0 text-amber-500">&#9888;</span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {guide.faq.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">Вопросы и ответы</h2>
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {guide.faq.map((item, i) => (
              <details key={i} className="group px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-zinc-900 marker:text-zinc-400">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related */}
      {guide.related.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-zinc-900">Связанные материалы</h2>
          <ul className="space-y-1">
            {guide.related.map((href) => (
              <li key={href}>
                <Link href={href} className="text-sm text-zinc-600 underline hover:text-zinc-900">{href}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA */}
      {guide.ctaLabel && guide.ctaHref && (
        <div className="pt-2">
          <Link href={guide.ctaHref} className="btn btn-primary inline-block">
            {guide.ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
