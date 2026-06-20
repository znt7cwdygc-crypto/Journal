import Link from "next/link";
import type { Metadata } from "next";
import { SafeImage } from "@/components/safe-image";
import { PLATFORM_DISCLAIMER } from "@/lib/disclaimer";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { siteDescription, siteName } from "@/lib/seo";
import { seoLandings } from "@/lib/seo-landings";
import { demoArticles } from "@/lib/ugc-demo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UGC-медиа о вебкам-индустрии",
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/"
  }
};

const seoEntryPoints = seoLandings.filter((landing) =>
  [
    "/guides/rabota-webcam-bez-opyta",
    "/guides/kak-stat-webcam-modelyu",
    "/guides/bezopasnost-webcam-modeli",
    "/vacancies/webcam-model",
    "/vacancies/operator",
    "/vacancies/remote",
    "/services/obs",
    "/services/legal",
    "/services/security",
    "/resumes/models"
  ].includes(landing.path)
);

const editorialCollections = [
  ["Лучшие истории недели", "/articles?sort=popular", "Материалы с просмотрами, реакциями и обсуждениями."],
  ["Новичкам", "/stories", "Истории старта, ошибки и практичные советы."],
  ["Про деньги", "/money", "Доходы, комиссии, выплаты и расходы."],
  ["Безопасность", "/safety", "Приватность, документы и красные флаги."],
  ["Выбор редакции", "/articles?sort=discussed", "То, что стоит прочитать первым."]
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
  const [articles, listings, products] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { createdBy: true, comments: true, ratings: true },
      orderBy: { createdAt: "desc" },
      take: 14
    }),
    prisma.listing.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 4
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: {
        id: true,
        title: true,
        category: true,
        priceRub: true,
        city: true,
        description: true,
        imageUrl: true
      },
      orderBy: { createdAt: "desc" },
      take: 3
    })
  ]);

  const realMainArticle = articles[0];
  const mainArticle = realMainArticle || demoArticles[0];
  const mainArticleSection = realMainArticle ? "Свежее" : demoArticles[0].section;
  const mainAuthorLabel = realMainArticle ? realMainArticle.createdBy.name || realMainArticle.createdBy.email || "Автор" : demoArticles[0].author;
  const mainCommentsLabel = realMainArticle ? `${realMainArticle.comments.length} комментариев` : `${demoArticles[0].comments} комментариев`;
  const mainViewsLabel = realMainArticle ? `${realMainArticle.viewCount} просмотров` : `${demoArticles[0].views} просмотров`;
  const mainCoverImage = "coverImage" in mainArticle ? safeImageUrl(mainArticle.coverImage) : null;
  const secondaryArticles = articles.length > 1 ? articles.slice(1, 4) : [];
  const popularArticles = [...articles].sort((a, b) => b.viewCount + b.repostCount - (a.viewCount + a.repostCount)).slice(0, 4);
  const featuredProduct = products[0];
  const feedArticles = articles.slice(1);
  const vacancyListings = listings.filter((listing) => listing.type === "VACANCY").slice(0, 2);
  const serviceListings = listings.filter((listing) => listing.type === "SERVICE").slice(0, 2);
  const listingBlocks = [
    { title: "Вакансии", href: "/vacancies", items: vacancyListings },
    { title: "Услуги", href: "/services", items: serviceListings }
  ];

  return (
    <div className="page-stack">
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
        <Link href={realMainArticle ? `/articles/${realMainArticle.id}` : "/articles"} className="media-card flex min-h-[360px] flex-col lg:min-h-[440px]">
          <p className="badge-topic mb-3">
            {mainArticleSection}
          </p>
          {mainCoverImage && (
            <SafeImage
              className="media-frame shrink-0 sm:aspect-[16/7]"
              src={mainCoverImage}
              alt={mainArticle.title}
              fallback={null}
            />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
          {(popularArticles[0] || secondaryArticles[0]) && (
            <Link href={`/articles/${(popularArticles[0] || secondaryArticles[0]).id}`} className="media-card flex min-h-[190px] flex-col lg:min-h-0">
              <p className="badge-format">Популярное</p>
              <h3 className="section-title mt-2">{(popularArticles[0] || secondaryArticles[0]).title}</h3>
              <p className="mt-2 line-clamp-4 text-sm leading-5 text-zinc-600">{previewText((popularArticles[0] || secondaryArticles[0]).summary, 220)}</p>
            </Link>
          )}
          <Link href={featuredProduct ? `/products/${featuredProduct.id}` : "/products"} className="media-card flex min-h-[190px] flex-col lg:min-h-0">
            <p className="badge-format">Товар</p>
            {featuredProduct ? (
              <>
                <h3 className="section-title mt-2">{featuredProduct.title}</h3>
                <p className="mt-2 text-base font-semibold text-ink">{formatPrice(featuredProduct.priceRub)} ₽</p>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-zinc-600">{previewText(featuredProduct.description, 180)}</p>
              </>
            ) : (
              <>
                <h3 className="section-title mt-2">Товары сообщества</h3>
                <p className="mt-2 text-sm leading-5 text-zinc-600">Оборудование, свет, камеры и полезные вещи участников.</p>
              </>
            )}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="content-card flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Товары</h2>
            <Link href="/products" className="text-sm font-medium text-accent">Все</Link>
          </div>
          <div className="mt-4 grid flex-1 gap-3">
            {products.map((product, index) => {
              const productImage = safeImageUrl(product.imageUrl);

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className={
                    index === 0
                      ? "flex min-h-[260px] flex-col rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition hover:border-hot hover:bg-white"
                      : "flex flex-col rounded-lg border border-zinc-100 p-4 transition hover:border-hot"
                  }
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-hot">{product.category}</p>
                      <p className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1 text-sm font-bold text-white">{formatPrice(product.priceRub)} ₽</p>
                    </div>
                    {index === 0 && productImage && (
                      <SafeImage className="mt-3 aspect-[16/9] w-full rounded-lg object-cover" src={productImage} alt={product.title} fallback={null} />
                    )}
                    <p className={index === 0 ? "mt-4 text-2xl font-semibold leading-tight text-ink" : "mt-3 text-lg font-semibold leading-snug text-ink"}>{product.title}</p>
                    <p className={index === 0 ? "mt-2 line-clamp-4 text-sm leading-6 text-zinc-600" : "mt-2 line-clamp-2 text-sm leading-5 text-zinc-600"}>{previewText(product.description, index === 0 ? 260 : 120)}</p>
                  </div>
                  <p className="mt-auto pt-4 text-xs text-zinc-500">{product.city || "город не указан"}</p>
                </Link>
              );
            })}
            {products.length === 0 && (
              <Link href="/products" className="block rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 hover:border-hot">
                Пока нет активных товаров. Раздел готов для новых объявлений.
              </Link>
            )}
          </div>
        </div>
        <div className="content-card">
          <div className="grid gap-4">
            {listingBlocks.map(({ title, href, items }) => (
              <div key={title} className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title text-lg">{title}</h2>
                  <Link href={href} className="text-sm font-medium text-accent">Все</Link>
                </div>
                <div className="mt-3 space-y-3">
                  {items.map((listing) => (
                    <Link key={listing.id} href={`/listings/${listing.id}`} className="block border-b border-zinc-100 pb-3 last:border-0">
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
            <h2 className="section-title mt-2">Редакционные маршруты</h2>
          </div>
          <Link href="/articles" className="text-sm font-medium text-accent">Вся лента</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {editorialCollections.map(([title, href, text]) => (
            <Link key={title} href={href} className="block rounded-lg border-t-4 border-hot bg-zinc-50 p-4 hover:bg-white hover:shadow-sm">
              <h3 className="font-semibold leading-snug">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{text}</p>
            </Link>
          ))}
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
          <Link href="/guides/rabota-webcam-bez-opyta" className="text-sm font-medium text-accent hover:text-teal-900">
            Начать с гайда
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {seoEntryPoints.map((landing, index) => (
            <Link
              key={landing.path}
              href={landing.path}
              className={`block rounded-lg border p-4 hover:border-hot ${
                index % 3 === 0 ? "border-red-100 bg-red-50/60" : index % 3 === 1 ? "border-sky-100 bg-sky-50/70" : "border-teal-100 bg-teal-50/70"
              }`}
            >
              <h3 className="font-semibold leading-snug">{landing.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{landing.description}</p>
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
              <Link key={article.id} href={`/articles/${article.id}`} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)]">
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

      <p className="text-xs text-zinc-500">{PLATFORM_DISCLAIMER}</p>
    </div>
  );
}
