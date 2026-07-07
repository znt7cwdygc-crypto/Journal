import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  deleteArticleAction,
  saveBlogDraftAction,
  toggleArticleVisibilityAction,
  updateBlogArticleAction
} from "@/app/actions";
import { ArticleEditorForm } from "@/components/article-editor-form";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { articleSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редактировать статью",
  robots: { index: false, follow: false }
};

function searchValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditArticlePage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { articleError?: string | string[] };
}) {
  const user = await requireUser();
  const article = await prisma.article.findFirst({ where: { id: params.id, createdById: user.id } });
  if (!article) notFound();

  const isPublished = article.status === "PUBLISHED";
  const articleError = (searchValue(searchParams?.articleError) || "").slice(0, 320);

  return (
    <div className="page-stack">
      <section className="section-card">
        <Link className="text-sm font-semibold text-accent hover:text-teal-900" href="/cabinet#materials">
          Назад в Мое
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Статья</p>
            <h1 className="page-title mt-1">Редактировать статью</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Можно обновить рубрику, формат, заголовок, описание, текст и обложку.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {article.status !== "DRAFT" && (
              <Link className="btn btn-ghost" href={articleSeoPath(article)}>
                Открыть
              </Link>
            )}
            <form action={toggleArticleVisibilityAction}>
              <input type="hidden" name="articleId" value={article.id} />
              <button className="btn btn-muted" type="submit">
                {isPublished ? "Скрыть" : "Опубликовать"}
              </button>
            </form>
            <form action={deleteArticleAction}>
              <input type="hidden" name="articleId" value={article.id} />
              <button className="btn btn-danger" type="submit">
                Удалить
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="section-card">
        {articleError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Статья не сохранена.</p>
            <p className="mt-1 leading-5">{articleError}</p>
          </div>
        )}
        <ArticleEditorForm
          action={updateBlogArticleAction}
          draftAction={saveBlogDraftAction}
          submitLabel="Сохранить"
          initialDraft={article}
        />
      </section>
    </div>
  );
}
