import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Гайды по вебкам-индустрии — MyCamDesk",
  description: "Понятные гайды о работе в вебкам-индустрии: безопасность, деньги, студии, оборудование, продвижение и частые вопросы новичков. Всё в одном месте.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Гайды по вебкам-индустрии — MyCamDesk",
    description: "Понятные гайды о работе в вебкам-индустрии: безопасность, деньги, студии, оборудование, продвижение и частые вопросы новичков.",
    url: "/guides",
    images: [{ url: siteUrl("/favicon.svg").toString() }]
  }
};

export default async function GuidesPage({ searchParams }: { searchParams?: { category?: string } }) {
  const categoryFilter = String(searchParams?.category ?? "").trim().slice(0, 120);

  const guides = await prisma.guide.findMany({
    where: { isPublished: true, kind: "guide" },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      path: true,
      audience: true,
      category: true,
    }
  });

  const categories = Array.from(
    new Set(guides.map((g) => g.category).filter((c): c is string => Boolean(c)))
  ).sort((a, b) => a.localeCompare(b, "ru"));

  const filtered = categoryFilter
    ? guides.filter((g) => g.category === categoryFilter)
    : guides;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Гайды",
        "description": "Понятные материалы о работе, безопасности, деньгах, студиях, оборудовании и продвижении.",
        "url": siteUrl("/guides").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl("/").toString() },
          { "@type": "ListItem", "position": 2, "name": "Гайды" }
        ]
      }) }} />

      <div className="min-w-0">
        <p className="eyebrow">Гайды</p>
        <h1 className="page-title mt-1">Гайды</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-lg sm:leading-8">
          Понятные материалы о работе, безопасности, деньгах, студиях, оборудовании и продвижении.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/guides"
            className={`rounded-full border px-3 py-1 text-sm transition ${!categoryFilter ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"}`}
          >
            Все
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/guides?category=${encodeURIComponent(cat)}`}
              className={`rounded-full border px-3 py-1 text-sm transition ${categoryFilter === cat ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"}`}
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Гайдов пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другую категорию или загляните позже.</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {filtered.map((guide) => (
          <Link
            key={guide.id}
            href={guide.path}
            className="content-card flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              {guide.category && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {guide.category}
                </span>
              )}
              {guide.audience && (
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                  {guide.audience}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold leading-snug text-zinc-900">{guide.title}</h2>
            <p className="line-clamp-3 text-xs text-zinc-500">{guide.description}</p>
            <span className="mt-auto text-xs font-medium text-zinc-900">Читать →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
