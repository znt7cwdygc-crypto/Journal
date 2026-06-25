import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  addArticleCommentAction,
  followAuthorAction,
  followTopicAction,
  likeCommentAction,
  rateArticleAction
} from "@/app/actions";
import { auth } from "@/auth";
import { ReportButton } from "@/components/report-button";
import { ShareArticleButton } from "@/components/share-article-button";
import { SafeImage } from "@/components/safe-image";
import { isHtmlArticleBody, sanitizeArticleHtml, stripArticleHtml } from "@/lib/article-html";
import { safeImageUrl } from "@/lib/media";
import { siteName, siteUrl, truncateSeo } from "@/lib/seo";
import { articleSeoPath, idFromSeoParam, pathTail } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

async function findPublishedArticle(slug: string, commentSort = "new") {
  const resolved = idFromSeoParam(slug);
  return prisma.article.findFirst({
    where: {
      OR: [
        { slug },
        ...(resolved.id ? [{ id: resolved.id }] : []),
        ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
        { id: slug }
      ],
      status: "PUBLISHED"
    },
    include: {
      comments: {
        where: { parentId: null, isHidden: false },
        include: {
          user: true,
          likes: true,
          replies: { where: { isHidden: false }, include: { user: true, likes: true }, orderBy: { createdAt: "asc" } }
        },
        orderBy: commentSort === "popular" ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }] : { createdAt: "desc" }
      },
      ratings: true,
      createdBy: { include: { authorFollowers: true } }
    }
  });
}

function renderArticleBody(body: string) {
  if (isHtmlArticleBody(body)) {
    return (
      <div
        className="article-html"
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(body) }}
      />
    );
  }

  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const imageMatch = block.match(/^!\[(.*?)\]\((\/(?:uploads|media)\/[^)\s]+|https?:\/\/[^)\s]+)\)$/);

      if (imageMatch) {
        const src = safeImageUrl(imageMatch[2].replace("/uploads/", "/media/"));
        if (src) {
          return (
            <SafeImage
              key={`${index}-${src}`}
              className="my-6 max-h-[560px] w-full rounded-lg object-cover"
              src={src}
              alt={imageMatch[1] || "Изображение статьи"}
              fallback={null}
            />
          );
        }
      }

      if (block.startsWith("- ")) {
        return (
          <ul key={index} className="my-5 list-disc space-y-2 pl-5">
            {block
              .split("\n")
              .map((item) => item.replace(/^-\s*/, "").trim())
              .filter(Boolean)
              .map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
          </ul>
        );
      }

      if (block.startsWith("“") || block.startsWith(">")) {
        return (
          <blockquote key={index} className="my-6 border-l-4 border-hot bg-red-50 px-4 py-3 text-lg font-medium leading-8 text-zinc-900">
            {block.replace(/^>\s*/, "")}
          </blockquote>
        );
      }

      const isHeading = block.length <= 80 && !/[.!?]$/.test(block) && !block.includes("\n");
      if (isHeading) {
        return <h2 key={index} className="mt-9 text-2xl font-semibold leading-tight tracking-tight text-zinc-950">{block}</h2>;
      }

      return (
        <p key={index} className="my-5 whitespace-pre-line text-base leading-8 text-zinc-800">
          {block}
        </p>
      );
    });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await findPublishedArticle(params.slug);
  if (!article) return { title: "Материал не найден", robots: { index: false, follow: false } };

  const path = articleSeoPath(article);
  const description = truncateSeo(article.summary || stripArticleHtml(article.body));

  return {
    title: article.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: path,
      siteName,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.createdBy.name || article.createdBy.email || "Автор WebcamExpert"]
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description
    }
  };
}

export default async function ArticleDetailsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { comments?: string; follow?: string; topicFollow?: string; reported?: string };
}) {
  const session = await auth();
  const article = await findPublishedArticle(params.slug, searchParams?.comments === "popular" ? "popular" : "new");

  if (!article) notFound();

  const canonicalPath = articleSeoPath(article);
  if (pathTail(canonicalPath) !== params.slug) {
    redirect(canonicalPath);
  }

  await prisma.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } }
  });

  const avg = article.ratings.length
    ? (article.ratings.reduce((sum, r) => sum + r.value, 0) / article.ratings.length).toFixed(1)
    : "—";
  const likes = article.ratings.filter((rating) => rating.value === 5).length;
  const useful = article.ratings.filter((rating) => rating.value === 4).length;
  const myRating = session?.user ? article.ratings.find((rating) => rating.userId === session.user.id)?.value : null;
  const replyCount = article.comments.reduce((sum, comment) => sum + comment.replies.length, 0);
  const participantCount = new Set([
    ...article.comments.map((comment) => comment.userId),
    ...article.comments.flatMap((comment) => comment.replies.map((reply) => reply.userId))
  ]).size;
  const commentCount = article.comments.length + replyCount;
  const shareUrl = siteUrl(canonicalPath).toString();
  const coverImage = safeImageUrl(article.coverImage);
  const authorImage = safeImageUrl(article.createdBy.image);
  const [isFollowingAuthor, isFollowingTopic] = session?.user
    ? await Promise.all([
        prisma.follow.findUnique({
          where: { followerId_authorId: { followerId: session.user.id, authorId: article.createdById } }
        }),
        article.topic
          ? prisma.topicFollow.findUnique({
              where: { userId_topic: { userId: session.user.id, topic: article.topic } }
            })
          : null
      ])
    : [null, null];
  const statPills = [
    { label: "Просмотры", value: article.viewCount + 1, className: "bg-zinc-100 text-zinc-700" },
    { label: "Нравится", value: likes, className: "bg-red-50 text-hot" },
    { label: "Полезно", value: useful, className: "bg-teal-50 text-accent" },
    { label: "Обсуждают", value: commentCount, className: "bg-sky-50 text-sky-700" },
    { label: "Репосты", value: article.repostCount, className: "bg-yellow-50 text-amber-800" }
  ];

  return (
    <article className="bg-white">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: truncateSeo(article.summary || stripArticleHtml(article.body)),
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            mainEntityOfPage: siteUrl(canonicalPath).toString(),
            author: {
              "@type": "Person",
              name: article.createdBy.name || article.createdBy.email || "Автор WebcamExpert",
              url: siteUrl(`/profiles/${article.createdById}`).toString()
            },
            image: coverImage || siteUrl("/favicon.svg").toString(),
            publisher: {
              "@type": "Organization",
              name: siteName,
              url: siteUrl("/").toString(),
              logo: { "@type": "ImageObject", url: siteUrl("/favicon.svg").toString() }
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl("/").toString() },
              { "@type": "ListItem", "position": 2, "name": "Лента", "item": siteUrl("/articles").toString() },
              { "@type": "ListItem", "position": 3, "name": article.title, "item": siteUrl(canonicalPath).toString() }
            ]
          })
        }}
      />
      {coverImage && (
        <SafeImage
          className="mb-6 aspect-[16/7] w-full object-cover"
          src={coverImage}
          alt={article.title}
          fallback={null}
        />
      )}
      <div className="p-6">
      <Link href="/articles" className="text-sm font-medium text-accent hover:text-teal-900">
        Назад в ленту
      </Link>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {article.topic && (
          <Link href={`/articles?topic=${encodeURIComponent(article.topic)}`} className="rounded-full bg-hot px-3 py-1 text-white">
            {article.topic}
          </Link>
        )}
        {article.format && <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{article.format}</span>}
        {useful >= 3 && <span className="rounded-full bg-yellow-50 px-3 py-1 text-amber-800">популярная статья</span>}
      </div>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">{article.title}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-7 text-zinc-700">{article.summary}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {statPills.map((pill) => (
          <span key={pill.label} className={`rounded-full px-3 py-1 font-medium ${pill.className}`}>
            {pill.label} {pill.value}
          </span>
        ))}
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-600">Рейтинг {avg}</span>
      </div>

      {(searchParams?.reported || searchParams?.follow || searchParams?.topicFollow) && (
        <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {searchParams?.reported
            ? "Жалоба отправлена в модерацию."
            : searchParams?.follow === "added"
              ? "Вы подписались на автора."
              : searchParams?.follow === "removed"
                ? "Вы отписались от автора."
                : searchParams?.topicFollow === "added"
                  ? "Вы подписались на рубрику."
                  : searchParams?.topicFollow === "removed"
                    ? "Вы отписались от рубрики."
                    : "Действие выполнено."}
        </div>
      )}

      <div className="prose mt-8 max-w-none text-base leading-8 text-zinc-800">{renderArticleBody(article.body)}</div>
      <Link href={`/profiles/${article.createdById}`} className="mt-5 flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm hover:border-hot">
        {authorImage ? (
          <SafeImage
            className="h-10 w-10 rounded object-cover"
            src={authorImage}
            alt={article.createdBy.name || "Аватар автора"}
            fallback={
              <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
                {(article.createdBy.name || article.createdBy.email || "A").slice(0, 1).toUpperCase()}
              </span>
            }
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
            {(article.createdBy.name || article.createdBy.email || "A").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <span className="block font-medium text-zinc-900">{article.createdBy.name || article.createdBy.email || "Профиль автора"}</span>
          {article.createdBy.profileBio && <span className="mt-0.5 block text-xs leading-5 text-zinc-600">{article.createdBy.profileBio}</span>}
          <span className="mt-1 flex flex-wrap gap-1 text-[11px] text-zinc-500">
            {article.createdBy.authorFollowers.length > 0 && <span>{article.createdBy.authorFollowers.length} подписчиков</span>}
            {useful >= 3 && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-accent">активный автор</span>}
          </span>
        </span>
      </Link>

      <section className="mt-8 border-y border-zinc-100 py-5">
        {session?.user ? (
          <div className="flex flex-wrap gap-2">
            <form action={followAuthorAction}>
              <input type="hidden" name="authorId" value={article.createdById} />
              <input type="hidden" name="next" value={canonicalPath} />
              <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">
                {isFollowingAuthor ? "Отписаться от автора" : "Подписаться на автора"}
              </button>
            </form>
            {article.topic && (
              <form action={followTopicAction}>
                <input type="hidden" name="topic" value={article.topic} />
                <input type="hidden" name="next" value={canonicalPath} />
                <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800" type="submit">
                  {isFollowingTopic ? "Отписаться от рубрики" : "Подписаться на рубрику"}
                </button>
              </form>
            )}
            <form action={rateArticleAction}>
              <input type="hidden" name="articleId" value={article.id} />
              <input type="hidden" name="value" value="5" />
              <button className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${myRating === 5 ? "bg-hot text-white shadow-red-200" : "bg-red-50 text-hot hover:bg-red-100"}`} type="submit">
                Нравится {likes}
              </button>
            </form>

            <form action={rateArticleAction}>
              <input type="hidden" name="articleId" value={article.id} />
              <input type="hidden" name="value" value="4" />
              <button className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${myRating === 4 ? "bg-accent text-white shadow-teal-100" : "bg-teal-50 text-accent hover:bg-teal-100"}`} type="submit">
                Полезно {useful}
              </button>
            </form>

            <Link className="rounded-lg bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100" href={`${canonicalPath}#comments`}>
              Обсудить {commentCount}
            </Link>

            <ShareArticleButton url={shareUrl} repostCount={article.repostCount} />
            <ReportButton
              targetType="ARTICLE"
              targetId={article.id}
              next={canonicalPath}
              buttonLabel="Пожаловаться"
              buttonClassName="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700"
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">Войдите, чтобы поставить реакцию, обсудить материал или сделать репост.</p>
            <Link href="/auth/signin" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">
              Войти
            </Link>
          </div>
        )}
      </section>

      <div id="comments" className="mt-6 space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">Обсуждение ({commentCount}) • участников: {participantCount}</p>
          <div className="flex gap-2">
            <Link className={`rounded px-3 py-1 ${searchParams?.comments === "popular" ? "bg-zinc-100" : "bg-ink text-white"}`} href={`${canonicalPath}?comments=new#comments`}>Новые</Link>
            <Link className={`rounded px-3 py-1 ${searchParams?.comments === "popular" ? "bg-ink text-white" : "bg-zinc-100"}`} href={`${canonicalPath}?comments=popular#comments`}>Популярные</Link>
          </div>
        </div>
        {session?.user && (
          <form key={`new-comment-${commentCount}`} action={addArticleCommentAction} className="flex flex-col gap-2 border border-zinc-200 bg-zinc-50 p-3 md:flex-row">
            <input type="hidden" name="articleId" value={article.id} />
            <input className="min-w-0 flex-1 rounded border border-zinc-200 px-3 py-2 text-sm" name="body" placeholder="Добавить комментарий" required minLength={2} />
            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white" type="submit">Отправить</button>
          </form>
        )}
        {commentCount === 0 && <p className="text-zinc-500">Комментариев пока нет.</p>}
        {article.comments.map((comment) => (
          <div key={comment.id} className="border border-zinc-100 bg-zinc-50 p-3">
            <p>
              <span className="font-medium">{comment.user.name || comment.user.email}:</span> {comment.body}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {session?.user && (
                <>
                  <form action={likeCommentAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button className="rounded bg-white px-2 py-1 text-xs font-medium text-hot" type="submit">Лайк {comment.likes.length}</button>
                  </form>
                  <ReportButton
                    targetType="COMMENT"
                    targetId={comment.id}
                    next={`${canonicalPath}#comments`}
                    buttonClassName="rounded bg-white px-2 py-1 text-xs text-zinc-600"
                  />
                </>
              )}
            </div>
            {session?.user && (
              <form key={`reply-${comment.id}-${comment.replies.length}`} action={addArticleCommentAction} className="mt-3 flex flex-col gap-2 md:flex-row">
                <input type="hidden" name="articleId" value={article.id} />
                <input type="hidden" name="parentId" value={comment.id} />
                <input className="min-w-0 flex-1 rounded border border-zinc-200 px-3 py-2 text-xs" name="body" placeholder="Ответить" required minLength={2} />
                <button className="rounded bg-white px-3 py-2 text-xs font-semibold" type="submit">Ответить</button>
              </form>
            )}
            {comment.replies.length > 0 && (
              <div className="mt-3 space-y-2 border-l-2 border-zinc-200 pl-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="bg-white p-2">
                    <p><span className="font-medium">{reply.user.name || reply.user.email}:</span> {reply.body}</p>
                    {session?.user && (
                      <form action={likeCommentAction} className="mt-1">
                        <input type="hidden" name="commentId" value={reply.id} />
                        <button className="text-xs font-medium text-hot" type="submit">Лайк {reply.likes.length}</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </article>
  );
}
