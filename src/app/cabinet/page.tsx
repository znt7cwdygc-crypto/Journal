import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import {
  createResumeAction,
  deleteArticleAction,
  deleteListingAction,
  saveBlogDraftAction,
  submitBlogArticleAction,
  submitListingAction,
  toggleArticleVisibilityAction,
  toggleListingVisibilityAction,
  updatePublicProfileAction,
  updateProfileSettingsAction
} from "@/app/actions";
import { ArticleEditorForm } from "@/components/article-editor-form";
import { ListingQuizDisclosure } from "@/components/listing-quiz-disclosure";
import { ModelResumeForm } from "@/components/model-resume-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false }
};

const createdMessages: Record<string, string> = {
  article: "Материал опубликован в ленте.",
  blog: "Статья опубликована в ленте.",
  listing: "Размещение опубликовано в разделе вакансий или услуг."
};

const updatedMessages: Record<string, string> = {
  resume: "Резюме сохранено и доступно в каталоге выбранного города.",
  profile: "Режим участия и тип профиля обновлены.",
  publicProfile: "Публичный профиль обновлен.",
  draft: "Черновик сохранен на сервере.",
  article: "Статья обновлена.",
  listing: "Размещение обновлено."
};

const profileKindLabels: Record<string, string> = {
  MODEL: "Модель",
  OPERATOR: "Оператор",
  STUDIO: "Студия",
  AGENCY: "Агентство",
  EXPERT: "Эксперт",
  COACH: "Коуч",
  LAWYER: "Юрист",
  OTHER: "Другое"
};

const articleStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  PENDING_REVIEW: "На проверке",
  ARCHIVED: "Скрыто"
};

const listingStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  PENDING_REVIEW: "На проверке",
  ARCHIVED: "Скрыто"
};

export default async function CabinetPage({
  searchParams
}: {
  searchParams?: { created?: string; updated?: string; editArticle?: string };
}) {
  const user = await requireUser();

  const [dbUser, myArticles, myListings, myResume, draftArticle, followedAuthors, followedTopics, savedListings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        followingAuthors: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 6 },
        topicFollows: { orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.article.findMany({ where: { createdById: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.listing.findMany({ where: { createdById: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.resume.findUnique({ where: { userId: user.id } }),
    prisma.article.findFirst({ where: { createdById: user.id, status: "DRAFT" }, orderBy: { updatedAt: "desc" } }),
    prisma.follow.findMany({ where: { followerId: user.id }, include: { author: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.topicFollow.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.savedListing.findMany({ where: { userId: user.id }, include: { listing: true }, orderBy: { createdAt: "desc" }, take: 6 })
  ]);

  const editArticleId = typeof searchParams?.editArticle === "string" ? searchParams.editArticle : "";
  const selectedArticle = editArticleId
    ? myArticles.find((article) => article.id === editArticleId) ?? null
    : null;
  const isEditingArticle = Boolean(selectedArticle);
  const providerMode = dbUser.accountMode === "PROVIDER" || dbUser.accountMode === "BOTH" || dbUser.role === "ADMIN";
  const createdMessage = searchParams?.created ? createdMessages[searchParams.created] : null;
  const updatedMessage = searchParams?.updated ? updatedMessages[searchParams.updated] : null;
  const profileName = dbUser.name || dbUser.email || "Профиль";
  const accountModeLabel =
    dbUser.accountMode === "PROVIDER"
      ? "Предлагаю услуги"
      : dbUser.accountMode === "BOTH"
        ? "Ищу и предлагаю"
        : "Ищу услуги / работу";
  const profileKindLabel = profileKindLabels[String(dbUser.profileKind || "MODEL")] || "Профиль";

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          {dbUser.image ? (
            <img className="h-12 w-12 shrink-0 rounded-lg object-cover" src={dbUser.image} alt={profileName} />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-hot text-lg font-black text-white">
              {profileName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Личный кабинет</p>
            <h1 className="truncate text-xl font-semibold leading-tight">{profileName}</h1>
            <p className="mt-1 truncate text-xs text-zinc-500">{accountModeLabel} • {profileKindLabel}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-zinc-50 p-2">
            <p className="text-lg font-semibold text-ink">{myArticles.length}</p>
            <p className="text-zinc-500">статей</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2">
            <p className="text-lg font-semibold text-ink">{myListings.length}</p>
            <p className="text-zinc-500">размещений</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2">
            <p className="text-lg font-semibold text-ink">{followedTopics.length + followedAuthors.length}</p>
            <p className="text-zinc-500">подписок</p>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 text-sm font-semibold sm:mx-0 sm:flex-wrap sm:px-0">
          <a className="shrink-0 rounded-lg bg-hot px-3 py-2 text-white shadow-sm shadow-red-200" href="/cabinet#blog">Написать</a>
          <a className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-white" href="#resume">Резюме</a>
          <a className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-700" href="#profile">Профиль</a>
          <a className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-700" href="#materials">Мое</a>
          {providerMode && <a className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-700" href="#vacancy">Вакансия</a>}
          {providerMode && <a className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-zinc-700" href="#service">Услуга</a>}
        </div>
      </section>

      {(createdMessage || updatedMessage) && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {createdMessage || updatedMessage}
        </section>
      )}

      <details id="profile" className="group rounded-lg border border-zinc-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Профиль и режим</h2>
            <p className="mt-1 text-xs text-zinc-500">Имя, аватар, описание и формат участия</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 group-open:bg-zinc-900 group-open:text-white">Открыть</span>
        </summary>
        <div className="border-t border-zinc-100 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {dbUser.image ? (
            <img className="h-20 w-20 rounded-lg object-cover" src={dbUser.image} alt={dbUser.name || "Аватар профиля"} />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-hot text-2xl font-black text-white">
              {(dbUser.name || dbUser.email || "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">Публичный профиль</h3>
            <form action={updatePublicProfileAction} className="mt-3 grid gap-2 md:grid-cols-2">
              <input className="rounded border p-2" name="name" defaultValue={dbUser.name ?? ""} placeholder="Имя или название" required />
              <input className="rounded border p-2" name="image" defaultValue={dbUser.image ?? ""} placeholder="Ссылка на аватар" />
              <textarea
                className="rounded border p-2 md:col-span-2"
                name="profileBio"
                defaultValue={dbUser.profileBio ?? ""}
                placeholder="Короткое описание профиля: кто вы, чем полезны, какой опыт или формат работы"
                rows={4}
              />
              <button className="rounded bg-hot px-3 py-2 font-medium text-white shadow-sm shadow-red-200 md:col-span-2" type="submit">
                Сохранить публичный профиль
              </button>
            </form>
          </div>
        </div>

        <form action={updateProfileSettingsAction} className="mt-4 grid gap-2 border-t border-zinc-100 pt-4 md:grid-cols-3">
          <select className="rounded border p-2" name="accountMode" defaultValue={dbUser.accountMode}>
            <option value="CONSUMER">Ищу услуги / работу</option>
            <option value="PROVIDER">Предлагаю услуги / вакансии</option>
            <option value="BOTH">Ищу и предлагаю</option>
          </select>
          <select className="rounded border p-2" name="profileKind" defaultValue={dbUser.profileKind}>
            <option value="MODEL">Модель</option>
            <option value="OPERATOR">Оператор</option>
            <option value="STUDIO">Студия</option>
            <option value="AGENCY">Агентство</option>
            <option value="EXPERT">Эксперт</option>
            <option value="COACH">Коуч</option>
            <option value="LAWYER">Юрист</option>
            <option value="OTHER">Другое</option>
          </select>
          <button className="rounded bg-ink px-3 py-2 text-white" type="submit">Обновить профиль</button>
        </form>
        </div>
      </details>

      {!providerMode && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <h2 className="font-medium text-sky-950">Вакансии и услуги скрыты</h2>
          <p className="mt-1 text-sm leading-5 text-sky-900">Чтобы публиковать вакансии и услуги, переключите режим в блоке профиля.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a className="rounded-lg bg-sky px-3 py-2 font-medium text-white" href="#profile">
              Изменить режим
            </a>
            <a className="rounded-lg border border-sky-200 bg-white px-3 py-2 font-medium text-sky-900" href="/articles">
              Читать ленту
            </a>
          </div>
        </section>
      )}

      <details id="blog" className="group rounded-lg bg-white shadow-sm" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h2 className="font-semibold">Статья</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {isEditingArticle ? "Вы редактируете выбранный материал" : "Новая история, разбор, вопрос или полезный материал"}
            </p>
          </div>
          <span className="rounded-full bg-hot px-3 py-1 text-xs font-semibold text-white">{isEditingArticle ? "Редактирование" : "Новая"}</span>
        </summary>
        <div className="border-t border-zinc-100 p-3">
          <div className="mb-3 flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{isEditingArticle ? selectedArticle?.title || "Черновик без названия" : "Написать новую статью"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {isEditingArticle
                  ? "Чтобы начать с пустой формы, нажмите «Новая статья»."
                  : draftArticle
                    ? "Есть сохраненный черновик ниже в «Моих статьях», его можно продолжить отдельно."
                    : "Заполните рубрику, формат, заголовок, обложку и текст."}
              </p>
            </div>
            {isEditingArticle ? (
              <a className="shrink-0 rounded-lg bg-hot px-3 py-2 text-center text-xs font-semibold text-white" href="/cabinet#blog">
                Новая статья
              </a>
            ) : draftArticle ? (
              <a className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-800" href={`/cabinet/articles/${draftArticle.id}/edit`}>
                Продолжить черновик
              </a>
            ) : null}
          </div>
          <ArticleEditorForm key={selectedArticle?.id ?? "new-article"} action={submitBlogArticleAction} draftAction={saveBlogDraftAction} initialDraft={selectedArticle} />
        </div>
      </details>

      <details id="resume" className="group rounded-lg bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Резюме модели</h2>
            <p className="mt-1 text-xs text-zinc-500">{myResume ? "Резюме уже опубликовано, можно обновить" : "Квиз-анкета для каталога резюме"}</p>
          </div>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">{myResume ? "Обновить" : "Создать"}</span>
        </summary>
        <div className="border-t border-zinc-100 p-3">
          <ModelResumeForm action={createResumeAction} resume={myResume} />
        </div>
      </details>

      {providerMode && (
        <>
          <ListingQuizDisclosure action={submitListingAction} kind="VACANCY" />
          <ListingQuizDisclosure action={submitListingAction} kind="SERVICE" />
        </>
      )}

      <details id="materials" className="group rounded-lg bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Мое</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Статьи, подписки, вакансии, услуги и сохраненные размещения в одном месте
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 group-open:bg-zinc-900 group-open:text-white">
            <span className="materials-label-closed">Открыть</span>
            <span className="materials-label-open">Свернуть</span>
          </span>
        </summary>

        <div className="border-t border-zinc-100 p-4">
          <div className="space-y-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Мои статьи</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myArticles.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {myArticles.map((article) => (
                <div key={article.id} className="rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{article.title || "Черновик без названия"}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {articleStatusLabels[String(article.status)] || String(article.status)}
                        {article.topic ? ` • ${article.topic}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href={`/cabinet/articles/${article.id}/edit`}>
                        {article.status === "DRAFT" ? "Продолжить" : "Редактировать"}
                      </a>
                      {article.status !== "DRAFT" && (
                        <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href={`/articles/${article.id}`}>
                          Открыть
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                    <form action={toggleArticleVisibilityAction}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" type="submit">
                        {article.status === "PUBLISHED" ? "Скрыть" : "Опубликовать"}
                      </button>
                    </form>
                    <form action={deleteArticleAction}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <button className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                        Удалить
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {myArticles.length === 0 && <p className="text-xs text-zinc-500">Здесь появятся опубликованные статьи и черновики.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Мои подписки</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{followedAuthors.length + followedTopics.length}</span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Авторы</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {followedAuthors.map((item) => (
                    <a key={item.id} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/profiles/${item.authorId}`}>
                      {item.author.name || item.author.email || "Автор"}
                    </a>
                  ))}
                  {followedAuthors.length === 0 && <p className="text-xs text-zinc-500">Пока нет подписок на авторов.</p>}
                </div>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Рубрики</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {followedTopics.map((item) => (
                    <a key={item.id} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href={`/articles?topic=${encodeURIComponent(item.topic)}`}>
                      {item.topic}
                    </a>
                  ))}
                  {followedTopics.length === 0 && <p className="text-xs text-zinc-500">Подпишитесь на рубрики в ленте статей.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Мои вакансии и услуги</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myListings.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {myListings.map((listing) => (
                <div key={listing.id} className="rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{listing.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {listing.type === "VACANCY" ? "Вакансия" : "Услуга"} • {listingStatusLabels[String(listing.status)] || String(listing.status)}
                        {listing.city ? ` • ${listing.city}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href={`/listings/${listing.id}`}>
                        Открыть
                      </a>
                      <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href={`/cabinet/listings/${listing.id}/edit`}>
                        Редактировать
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                    <form action={toggleListingVisibilityAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" type="submit">
                        {listing.status === "PUBLISHED" ? "Скрыть" : "Опубликовать"}
                      </button>
                    </form>
                    <form action={deleteListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                        Удалить
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {myListings.length === 0 && <p className="text-xs text-zinc-500">Здесь появятся ваши вакансии и услуги.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Сохраненные вакансии и услуги</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{savedListings.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedListings.map((item) => (
                <a key={item.id} className="block rounded-lg bg-white p-3 text-sm hover:text-hot" href={`/listings/${item.listingId}`}>
                  <p className="truncate font-medium">{item.listing.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.listing.type === "VACANCY" ? "Вакансия" : "Услуга"}</p>
                </a>
              ))}
              {savedListings.length === 0 && <p className="text-xs text-zinc-500">Пока ничего не сохранено.</p>}
            </div>
          </div>
          </div>
        </div>
      </details>

    </div>
  );
}
