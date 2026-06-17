import Link from "next/link";
import type { Metadata } from "next";
import { SafeImage } from "@/components/safe-image";
import { PLATFORM_DISCLAIMER } from "@/lib/disclaimer";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { siteDescription, siteName } from "@/lib/seo";
import { seoLandings } from "@/lib/seo-landings";
import { demoArticles, expertAuthors } from "@/lib/ugc-demo";

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

export default async function HomePage() {
  const now = new Date();
  const [articles, authors, listings] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { createdBy: true, comments: true, ratings: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { articles: { some: { status: "PUBLISHED" } } },
          { listings: { some: { status: "PUBLISHED" } } },
          { resume: { is: { isPublic: true, hiddenByInactivity: false, expiresAt: { gt: now } } } }
        ]
      },
      include: {
        _count: { select: { articles: { where: { status: "PUBLISHED" } }, listings: { where: { status: "PUBLISHED" } } } }
      },
      orderBy: { updatedAt: "desc" },
      take: 3
    }),
    prisma.listing.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 4
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
  const discussedArticles = [...articles]
    .sort((a, b) => b.comments.length + b.responseCount - (a.comments.length + a.responseCount))
    .slice(0, 4);

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

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Link href={realMainArticle ? `/articles/${realMainArticle.id}` : "/articles"} className={`media-card flex min-h-0 flex-col ${mainCoverImage ? "h-full" : "self-start"}`}>
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
          <div className={`flex flex-col pt-4 ${mainCoverImage ? "flex-1 justify-between" : "gap-5"}`}>
            <div>
              <h2 className="card-title">{mainArticle.title}</h2>
              <p className="body-copy mt-3 line-clamp-4">{previewText(mainArticle.summary, 260)}</p>
            </div>
            <div className="meta-row pt-5">
              <span>{mainAuthorLabel}</span>
              <span>{mainCommentsLabel}</span>
              <span>{mainViewsLabel}</span>
            </div>
          </div>
        </Link>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {[
            ["Популярное", popularArticles[0] || secondaryArticles[0]],
            ["Обсуждаемое", discussedArticles[0] || secondaryArticles[2]]
          ].filter(([, article]) => article).map(([label, article]) => (
            <Link key={`${label}-${typeof article === "object" ? article.id : label}`} href={typeof article === "object" && "createdBy" in article ? `/articles/${article.id}` : "/articles"} className="media-card flex min-h-[138px] flex-col">
              <p className="badge-format">{String(label)}</p>
              {typeof article === "object" && (
                <>
                  <h3 className="section-title mt-2">{article.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-zinc-600">{previewText(article.summary)}</p>
                </>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="content-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Обсуждаемое</h2>
            <Link href="/articles?sort=discussed" className="text-sm font-medium text-accent">Все</Link>
          </div>
          <div className="mt-3 space-y-3">
            {discussedArticles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`} className="block border-b border-zinc-100 pb-3 last:border-0">
                <p className="font-medium leading-snug">{article.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{article.comments.length + article.responseCount} обсуждений • {article.repostCount} репостов</p>
              </Link>
            ))}
            {discussedArticles.length === 0 && <p className="text-sm text-zinc-500">Пока нет обсуждений.</p>}
          </div>
        </div>
        <div className="content-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Вакансии и услуги</h2>
            <Link href="/vacancies" className="text-sm font-medium text-accent">Смотреть</Link>
          </div>
          <div className="mt-3 space-y-3">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`} className="block border-b border-zinc-100 pb-3 last:border-0">
                <p className="text-xs font-semibold text-hot">{listing.type === "VACANCY" ? "Вакансия" : "Услуга"}</p>
                <p className="mt-1 font-medium leading-snug">{listing.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{listing.createdBy.name || listing.createdBy.email || "Автор"} • {listing.city || "без города"}</p>
              </Link>
            ))}
            {listings.length === 0 && <p className="text-sm text-zinc-500">Пока нет активных размещений.</p>}
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
          <h2 className="section-title">Авторы недели</h2>
          <Link href="/articles" className="text-sm font-medium text-accent hover:text-teal-900">
            Все материалы
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(authors.length ? authors : []).map((author) => {
            const authorImage = safeImageUrl(author.image);

            return (
              <Link key={author.id} href={`/profiles/${author.id}`} className="rounded-lg border border-zinc-200 p-4 hover:border-hot">
                {authorImage ? (
                  <SafeImage
                    className="h-9 w-9 rounded object-cover"
                    src={authorImage}
                    alt={author.name || "Аватар автора"}
                    fallback={
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hot text-sm font-semibold text-white">
                        {(author.name || author.email || "A").slice(0, 1).toUpperCase()}
                      </div>
                    }
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hot text-sm font-semibold text-white">
                    {(author.name || author.email || "A").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <p className="mt-3 font-medium">{author.name || author.email || "Автор"}</p>
                <p className="mt-1 text-sm text-zinc-600">{author.profileKind}</p>
                <p className="mt-3 text-xs text-zinc-500">{author._count.articles} статей • {author._count.listings} размещений</p>
              </Link>
            );
          })}
          {authors.length === 0 && expertAuthors.map(([name, role, count]) => (
            <div key={name} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hot text-sm font-semibold text-white">{name.slice(0, 1)}</div>
              <p className="mt-3 font-medium">{name}</p>
              <p className="mt-1 text-sm text-zinc-600">{role}</p>
              <p className="mt-3 text-xs text-zinc-500">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-zinc-500">{PLATFORM_DISCLAIMER}</p>
    </div>
  );
}
