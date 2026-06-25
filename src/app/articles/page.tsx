import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { followTopicAction } from "@/app/actions";
import { auth } from "@/auth";
import { AdBlock } from "@/components/ad-block";
import { ReportButton } from "@/components/report-button";
import { SafeImage } from "@/components/safe-image";
import { stripArticleHtml } from "@/lib/article-html";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { articleSeoPath } from "@/lib/seo-url";
import { topicNav } from "@/lib/ugc-demo";
import { siteUrl } from "@/lib/seo";
import { articleTopic as inferArticleTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams?: { topic?: string } }): Promise<Metadata> {
  const topic = searchParams?.topic && topicNav.includes(searchParams.topic) ? searchParams.topic : undefined;
  const title = topic ? `Материалы на тему ${topic}` : "Материалы, разборы и обсуждения";
  const description = topic
    ? `Авторские статьи, разборы и обсуждения WebcamExpert по теме ${topic}.`
    : "Лента авторских историй, экспертных инструкций, разборов и обсуждений сообщества WebcamExpert.";

  return {
    title,
    description,
    alternates: { canonical: topic ? `/articles?topic=${encodeURIComponent(topic)}` : "/articles" },
    openGraph: { title, description, url: topic ? `/articles?topic=${encodeURIComponent(topic)}` : "/articles" }
  };
}

function previewText(text: string) {
  const preview = stripArticleHtml(text) || text;
  return preview.length > 260 ? `${preview.slice(0, 260)}...` : preview;
}

const sortOptions = [
  { key: "new", label: "Свежее" },
  { key: "popular", label: "Популярное" },
  { key: "discussed", label: "Обсуждаемое" }
];

function articleTopicWhere(topic: string | undefined): Prisma.ArticleWhereInput {
  if (!topic || !topicNav.includes(topic)) return {};

  return {
    OR: [
      { topic },
      { title: { contains: topic, mode: "insensitive" } },
      { summary: { contains: topic, mode: "insensitive" } },
      { body: { contains: topic, mode: "insensitive" } }
    ]
  };
}

export default async function ArticlesPage({
  searchParams
}: {
  searchParams?: { topic?: string; sort?: string; topicFollow?: string; reported?: string };
}) {
  const session = await auth();
  const activeTopic = searchParams?.topic;
  const activeSort = sortOptions.some((option) => option.key === searchParams?.sort) ? String(searchParams?.sort) : "new";
  const currentParams = new URLSearchParams();
  if (activeTopic) currentParams.set("topic", activeTopic);
  if (activeSort !== "new") currentParams.set("sort", activeSort);
  const currentPath = currentParams.toString() ? `/articles?${currentParams.toString()}` : "/articles";
  const [articles, followedTopics] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        ...articleTopicWhere(activeTopic)
      },
      include: {
        comments: true,
        ratings: true,
        createdBy: true
      },
      orderBy:
        activeSort === "popular"
          ? [{ viewCount: "desc" }, { repostCount: "desc" }, { createdAt: "desc" }]
          : activeSort === "discussed"
            ? [{ responseCount: "desc" }, { createdAt: "desc" }]
            : { createdAt: "desc" }
    }),
    session?.user
      ? prisma.topicFollow.findMany({ where: { userId: session.user.id }, select: { topic: true } })
      : Promise.resolve([])
  ]);
  const followedTopicSet = new Set(followedTopics.map((follow) => follow.topic));

  return (
    <div className="page-stack">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Статьи и материалы сообщества",
        "description": "Лента авторских историй, экспертных инструкций, разборов и обсуждений сообщества WebcamExpert.",
        "url": siteUrl("/articles").toString(),
        "isPartOf": { "@type": "WebSite", "name": "WebcamExpert Journal", "url": siteUrl("/").toString() }
      }) }} />
      <section className="content-card overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="badge-status">
              Лента сообщества
            </p>
            <h1 className="page-title mt-2">Материалы, разборы и обсуждения</h1>
            <p className="body-copy mt-2 max-w-2xl text-zinc-600">
              Здесь собираются авторские истории, экспертные инструкции и публикации от студий. Формат ближе к
              социальной ленте: видно автора, активность, комментарии и быстрые действия.
            </p>
          </div>
          <Link className="btn btn-primary" href="/cabinet">
            Написать материал
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {sortOptions.map((option) => {
            const params = new URLSearchParams();
            if (activeTopic) params.set("topic", activeTopic);
            params.set("sort", option.key);
            const active = activeSort === option.key;

            return (
              <Link
                key={option.key}
                href={`/articles?${params.toString()}`}
                className={`btn shrink-0 ${active ? "btn-secondary" : "btn-muted"}`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
        <div className="topic-filter-row no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 xl:hidden">
          {["Все", ...topicNav].map((tab, index) => {
            const active = tab === "Все" ? !activeTopic : activeTopic === tab;
            const params = new URLSearchParams();
            if (tab !== "Все") params.set("topic", tab);
            if (activeSort !== "new") params.set("sort", activeSort);
            const href = params.toString() ? `/articles?${params.toString()}` : "/articles";
            return (
            <Link
              key={tab}
              href={href}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium ${
                active
                  ? "border-hot bg-hot text-white"
                  : index % 3 === 1
                    ? "border-yellow-200 bg-yellow-50 text-amber-800 hover:bg-yellow-100"
                    : index % 3 === 2
                      ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                      : "border-teal-200 bg-teal-50 text-accent hover:bg-teal-100"
              }`}
            >
              {tab}
            </Link>
          );
          })}
        </div>
      </section>

      {(searchParams?.reported || searchParams?.topicFollow) && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {searchParams?.reported
            ? "Жалоба отправлена в модерацию."
            : searchParams?.topicFollow === "added"
              ? "Вы подписались на рубрику."
              : "Вы отписались от рубрики."}
        </section>
      )}

      <AdBlock placement="articles" />

      {articles.length === 0 && !activeTopic && (
        <section className="content-card">
          <h2 className="font-medium">Лента пока пуста</h2>
          <p className="mt-2 text-sm text-zinc-600">Здесь будут статьи, истории и разборы от авторов сообщества.</p>
          <div className="mt-3">
            <Link className="btn btn-primary text-sm" href="/cabinet">Написать первую статью</Link>
          </div>
        </section>
      )}

      {articles.length === 0 && activeTopic && (
        <section className="content-card text-sm text-zinc-600">
          В теме “{activeTopic}” пока нет опубликованных материалов.
        </section>
      )}

      {articles.map((article) => {
        const likes = article.ratings.filter((r) => r.value === 5).length;
        const useful = article.ratings.filter((r) => r.value === 4).length;
        const reactions = likes + useful;
        const comments = article.comments.length;
        const topic = article.topic || inferArticleTopic(article.title, `${article.summary} ${stripArticleHtml(article.body)}`);
        const coverImage = safeImageUrl(article.coverImage);
        const authorImage = safeImageUrl(article.createdBy.image);
        const articlePath = articleSeoPath(article);

        return (
          <article key={article.id} className="media-card overflow-hidden">
            <Link href={articlePath} className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="badge-topic">{topic}</span>
              {article.format && <span className="badge-format">{article.format}</span>}
            </Link>
            {coverImage && (
              <Link href={articlePath} className="block">
                <SafeImage
                  className="media-frame sm:aspect-[16/6]"
                  src={coverImage}
                  alt={article.title}
                  fallback={null}
                />
              </Link>
            )}
            <Link href={articlePath} className="block">
              <div className="meta-row pt-4">
                {authorImage ? (
                  <SafeImage
                    className="h-6 w-6 rounded object-cover"
                    src={authorImage}
                    alt={article.createdBy.name || "Аватар автора"}
                    fallback={
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-[10px] font-black text-white">
                        {(article.createdBy.name || article.createdBy.email || "A").slice(0, 1).toUpperCase()}
                      </span>
                    }
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-[10px] font-black text-white">
                    {(article.createdBy.name || article.createdBy.email || "A").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{article.createdBy.name || article.createdBy.email || "Автор"}</span>
                <span>{article.publishedAt ? article.publishedAt.toLocaleDateString("ru-RU") : "на модерации"}</span>
              </div>
              <div className="pt-4">
                <h2 className="card-title">{article.title}</h2>
                <p className="body-copy mt-3 font-medium">{article.summary}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{previewText(article.body)}</p>
                <p className="mt-4 text-sm font-semibold text-hot">Читать полностью</p>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                  <span>{article.viewCount} просмотров</span>
                  <span>{reactions} реакций</span>
                  <span>{comments} комментариев</span>
                  <span>{article.repostCount} репостов</span>
                </div>
              </div>
            </Link>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <form action={followTopicAction} className="contents sm:block">
                <input type="hidden" name="topic" value={topic} />
                <input type="hidden" name="next" value={currentPath} />
                <button className="btn btn-muted w-full sm:w-auto" type="submit">
                  {followedTopicSet.has(topic) ? "Отписаться от рубрики" : "Подписаться на рубрику"}
                </button>
              </form>
              <ReportButton
                targetType="ARTICLE"
                targetId={article.id}
                next={currentPath}
                buttonClassName="btn btn-danger w-full sm:w-auto"
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
