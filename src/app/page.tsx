import Link from "next/link";
import type { Metadata } from "next";
import { AdBlock } from "@/components/ad-block";
import { SafeImage } from "@/components/safe-image";
import { PLATFORM_DISCLAIMER } from "@/lib/disclaimer";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { articleSeoPath, listingSeoPath, productSeoPath } from "@/lib/seo-url";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "MyCamDesk — UGC-медиа о вебкам-индустрии: статьи, вакансии, резюме, услуги",
  description: "MyCamDesk — UGC-медиа о вебкам-индустрии. Личный опыт, разборы, вакансии студий, резюме моделей и операторов, услуги экспертов. Всё в одном сообществе.",
  alternates: { canonical: "/" },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/"
  }
};

const editorialCollections = [
  {
    title: "Новичкам",
    href: "/stories",
    label: "Старт",
    text: "Истории входа в индустрию, первые ошибки и понятные советы без лишней теории."
  },
  {
    title: "Про деньги",
    href: "/money",
    label: "Доход",
    text: "Выплаты, проценты, расходы, комиссии и честные разборы заработка."
  },
  {
    title: "Безопасность",
    href: "/safety",
    label: "Защита",
    text: "Приватность, документы, стоп-сигналы и правила, которые лучше знать заранее."
  },
  {
    title: "Лучшие истории недели",
    href: "/articles?sort=popular",
    label: "Выбор",
    text: "Материалы, которые чаще читают, обсуждают и сохраняют участники сообщества."
  }
];

function previewText(text: string, max = 180) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function articleMeta(article: { comments: unknown[]; responseCount: number; viewCount: number; createdBy: { name: string | null; email: string | null } }) {
  return [
    article.createdBy.name || article.createdBy.email || "Автор",
    `${article.comments.length + article.responseCount} обсуждений`,
    `${article.viewCount} просмотров`
  ].join(" • ");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default async function HomePage() {
  const now = new Date();
  const activeListingWhere = { status: "PUBLISHED" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  const [articles, vacancyListings, serviceListings, products, seoEntryPoints] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { createdBy: true, comments: true, ratings: true },
      orderBy: { createdAt: "desc" },
      take: 14
    }),
    prisma.listing.findMany({
      where: { ...activeListingWhere, type: "VACANCY" },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 2
    }),
    prisma.listing.findMany({
      where: { ...activeListingWhere, type: "SERVICE" },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 2
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: {
        id: true,
        title: true,
        category: true,
        priceRub: true,
        city: true,
        description: true
      },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.guide.findMany({
      where: { isPublished: true, showOnHome: true },
      select: { path: true, title: true, description: true, category: true },
      orderBy: { sortOrder: "asc" },
      take: 8
    })
  ]);

  const mainArticle = articles[0] ?? null;
  const mainAuthorLabel = mainArticle ? mainArticle.createdBy.name || mainArticle.createdBy.email || "Автор" : "";
  const mainCommentsLabel = mainArticle ? `${mainArticle.comments.length} комментариев` : "";
  const mainViewsLabel = mainArticle ? `${mainArticle.viewCount} просмотров` : "";
  const mainCoverImage = mainArticle ? safeImageUrl(mainArticle.coverImage) : null;
  const secondaryArticles = articles.length > 1 ? articles.slice(1, 4) : [];
  const popularArticles = [...articles].sort((a, b) => b.viewCount + b.repostCount - (a.viewCount + a.repostCount)).slice(0, 4);
  const discussedArticles = [...articles]
    .sort((a, b) => b.comments.length + b.responseCount - (a.comments.length + a.responseCount))
    .slice(0, 4);
  const feedArticles = articles.length > 1 ? articles.slice(1) : articles;
  const listingBlocks = [
    { title: "Вакансии", href: "/vacancies", items: vacancyListings },
    { title: "Услуги", href: "/services", items: serviceListings }
  ];

  return (
    <div className="page-stack">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": siteName,
        "description": siteDescription,
        "url": siteUrl("/").toString(),
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": siteUrl("/search?q={search_term_string}").toString() },
          "query-input": "required name=search_term_string"
        }
      }) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": siteName,
        "url": siteUrl("/").toString(),
        "description": siteDescription,
        "logo": { "@type": "ImageObject", "url": siteUrl("/favicon.svg").toString() },
        "sameAs": []
      }) }} />
      <section className="section-card overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Живая лента</p>
            <h1 className="page-title mt-1">Материалы сообщества</h1>
            <p className="body-copy mt-2 max-w-2xl text-zinc-600">Истории, разборы, вопросы, вакансии и услуги сразу на первом экране.</p>
          </div>
          <div className="grid gap-2 text-sm sm:flex sm:flex-wrap">
            <Link className="btn btn-primary" href="/cabinet">
              Написать историю
            </Link>
            <Link className="btn btn-secondary" href="/cabinet">
              Разместить вакансию
            </Link>
            <Link className="btn btn-ghost" href="/cabinet">
              Предложить услугу
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-stretch">
        {mainArticle ? (
          <Link href={articleSeoPath(mainArticle)} className="media-card flex min-h-[360px] flex-col lg:min-h-[440px]">
            <p className="badge-topic mb-3">Свежее</p>
            {mainCoverImage && (
              <SafeImage className="media-frame shrink-0 sm:aspect-[16/7]" src={mainCoverImage} alt={mainArticle.title} fallback={null} />
            )}
            <div className="flex flex-1 flex-col justify-between pt-4">
              <div>
                <h2 className="card-title">{mainArticle.title}</h2>
                <p className="body-copy mt-3 line-clamp-6">{previewText(mainArticle.summary, 320)}</p>
              </div>
              <div className="meta-row pt-5">
                <span>{mainAuthorLabel}</span>
                <span>{mainCommentsLabel}</span>
                <span>{mainViewsLabel}</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="media-card flex min-h-[360px] flex-col items-center justify-center text-center lg:min-h-[440px]">
            <p className="text-lg font-semibold text-zinc-400">Скоро здесь появятся статьи</p>
            <p className="mt-2 text-sm text-zinc-500">Станьте первым автором сообщества</p>
            <Link className="btn btn-primary mt-4 text-sm" href="/cabinet">Написать статью</Link>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
          {[
            ["Популярное", popularArticles[0] || secondaryArticles[0]],
            ["Обсуждаемое", discussedArticles[0] || secondaryArticles[2]]
          ].filter(([, article]) => article).map(([label, article]) => (
            <Link key={`${label}-${typeof article === "object" ? article.id : label}`} href={typeof article === "object" && "createdBy" in article ? articleSeoPath(article) : "/articles"} className="media-card flex min-h-[190px] flex-col lg:min-h-0">
              <p className="badge-format">{String(label)}</p>
              {typeof article === "object" && (
                <>
                  <h3 className="section-title mt-2">{article.title}</h3>
                  <p className="mt-2 line-clamp-4 text-sm leading-5 text-zinc-600">{previewText(article.summary, 220)}</p>
                </>
              )}
            </Link>
          ))}
        </div>
      </section>

      <AdBlock placement="home" />
      <div className="xl:hidden">
        <AdBlock placement="sidebar" />
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="content-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Товары</h2>
            <Link href="/products" className="text-sm font-medium text-accent">Все</Link>
          </div>
          <div className="mt-3 space-y-3">
            {products.map((product) => (
              <Link key={product.id} href={productSeoPath(product)} className="block border-b border-zinc-100 pb-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug line-clamp-2">{product.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{product.category} • {product.city || "город не указан"}</p>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-zinc-500">{product.description}</p>
                  </div>
                  <p className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-sm font-semibold leading-none text-ink">{formatPrice(product.priceRub)} ₽</p>
                </div>
              </Link>
            ))}
            {products.length === 0 && <p className="text-sm text-zinc-500">Пока нет активных товаров.</p>}
          </div>
        </div>
        <div className="content-card h-full">
          <div className="grid h-full gap-4 md:grid-rows-2">
            {listingBlocks.map(({ title, href, items }) => (
              <div key={title} className="flex min-w-0 flex-col">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title text-lg">{title}</h2>
                  <Link href={href} className="text-sm font-medium text-accent">Все</Link>
                </div>
                <div className="mt-3 flex flex-1 flex-col justify-start space-y-3">
                  {items.map((listing) => (
                    <Link key={listing.id} href={listingSeoPath(listing)} className="block border-b border-zinc-100 pb-3 last:border-0">
                      <p className="font-medium leading-snug line-clamp-2">{listing.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{listing.createdBy.name || listing.createdBy.email || "Автор"} • {listing.city || "без города"}</p>
                    </Link>
                  ))}
                  {items.length === 0 && <p className="text-sm text-zinc-500">Пока нет активных объявлений.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Подборки</p>
            <h2 className="section-title mt-2">С чего начать</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Быстрые маршруты по самым важным темам: старт, деньги, безопасность и материалы, которые уже читают в сообществе.
            </p>
          </div>
          <Link href="/articles" className="text-sm font-medium text-accent">Вся лента</Link>
        </div>
        <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {editorialCollections.map((item) => (
            <Link key={item.title} href={item.href} className="group flex flex-col rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition hover:border-hot hover:bg-white hover:shadow-sm sm:p-4">
              <span className="w-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-hot ring-1 ring-zinc-100 group-hover:ring-red-100 sm:px-2.5 sm:py-1 sm:text-[11px]">
                {item.label}
              </span>
              <h3 className="mt-2 text-sm font-semibold leading-snug sm:mt-3">{item.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-zinc-600 line-clamp-3 sm:mt-2 sm:line-clamp-none">{item.text}</p>
              <span className="mt-2 text-xs font-semibold text-accent sm:mt-3">Открыть подборку</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Лента</p>
            <h2 className="section-title mt-2">Все статьи</h2>
          </div>
          <Link href="/articles" className="text-sm font-medium text-accent hover:text-teal-900">
            Открыть ленту
          </Link>
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {feedArticles.map((article) => {
            const coverImage = safeImageUrl(article.coverImage);

            return (
              <Link key={article.id} href={articleSeoPath(article)} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)]">
                {coverImage ? (
                  <SafeImage className="aspect-[16/10] w-full rounded-lg object-cover" src={coverImage} alt={article.title} fallback={null} />
                ) : (
                  <div className="hidden sm:block" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-hot">{article.topic}</p>
                  <h3 className="mt-1 text-lg font-semibold leading-tight text-ink">{article.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{previewText(article.summary, 180)}</p>
                  <p className="mt-2 text-xs text-zinc-500">{articleMeta(article)}</p>
                </div>
              </Link>
            );
          })}
          {feedArticles.length === 0 && <p className="text-sm text-zinc-500">Пока нет дополнительных статей.</p>}
        </div>
      </section>

      <section className="content-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded bg-sun px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              Полезное
            </p>
            <h2 className="section-title mt-2">Гайды и страницы под частые вопросы</h2>
          </div>
          <Link href="/guides" className="text-sm font-medium text-accent hover:text-teal-900">
            Все гайды
          </Link>
        </div>
        <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-3">
          {seoEntryPoints.map((landing) => (
            <Link
              key={landing.path}
              href={landing.path}
              className="group flex flex-col rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition hover:border-hot hover:bg-white hover:shadow-sm sm:p-4"
            >
              <span className="w-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-hot ring-1 ring-zinc-100 group-hover:ring-red-100 sm:px-2.5 sm:py-1 sm:text-[11px]">
                {landing.category || "Гайд"}
              </span>
              <h3 className="mt-2 text-sm font-semibold leading-snug sm:mt-3">{landing.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-zinc-600 line-clamp-3 sm:mt-2">{landing.description}</p>
              <span className="mt-2 text-xs font-semibold text-accent sm:mt-3">Читать →</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-zinc-500">{PLATFORM_DISCLAIMER}</p>
    </div>
  );
}
