import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import {
  createResumeAction,
  deleteArticleAction,
  deleteListingAction,
  deleteProductAction,
  renewListingAction,
  renewMatchProfileAction,
  renewProductAction,
  renewResumeAction,
  saveBlogDraftAction,
  submitBlogArticleAction,
  submitListingAction,
  submitMatchProfileAction,
  submitProductAction,
  toggleArticleVisibilityAction,
  toggleListingVisibilityAction,
  toggleProductVisibilityAction,
  updatePublicProfileAction,
  updateProfileSettingsAction
} from "@/app/actions";
import { AdBlock } from "@/components/ad-block";
import { ArticleEditorForm } from "@/components/article-editor-form";
import { CabinetPanelRouter } from "@/components/cabinet-panel-router";
import { InviteCard } from "@/components/invite-card";
import { ListingQuizDisclosure } from "@/components/listing-quiz-disclosure";
import { MatchProfileForm } from "@/components/match-profile-form";
import { ProductForm } from "@/components/product-form";
import { ProductPublishCleanup } from "@/components/product-publish-cleanup";
import { ResumeQuizDisclosure } from "@/components/resume-quiz-disclosure";
import { prisma } from "@/lib/prisma";
import { articleSeoPath, listingSeoPath, matchProfileSeoPath, productSeoPath, resumeSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false }
};

const createdMessages: Record<string, string> = {
  article: "Материал опубликован в ленте.",
  blog: "Статья опубликована в ленте.",
  listing: "Размещение опубликовано в разделе вакансий или услуг.",
  product: "Товар опубликован в разделе товаров на 30 дней."
};

const updatedMessages: Record<string, string> = {
  resume: "Резюме опубликовано и доступно в каталоге на 7 дней.",
  profile: "Режим участия и тип профиля обновлены.",
  publicProfile: "Публичный профиль обновлен.",
  draft: "Черновик сохранен на сервере.",
  article: "Статья обновлена.",
  listing: "Размещение обновлено.",
  listingRenewed: "Публикация продлена на 30 дней.",
  resumeRenewed: "Резюме продлено на 7 дней.",
  product: "Товар обновлен.",
  productRenewed: "Товар продлен на 30 дней."
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

function formatDeadline(date?: Date | null) {
  return date ? date.toLocaleDateString("ru-RU") : "срок не указан";
}

function searchValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CabinetPage({
  searchParams
}: {
  searchParams?: {
    created?: string | string[];
    updated?: string | string[];
    editArticle?: string | string[];
    articleId?: string | string[];
    listingId?: string | string[];
    matchProfileId?: string | string[];
    resumeId?: string | string[];
    productReset?: string | string[];
    productError?: string | string[];
    inviteResponse?: string | string[];
    inviteReport?: string | string[];
    invited?: string | string[];
  };
}) {
  const user = await requireUser();

  const [dbUser, myArticles, myListings, myProducts, myResume, myMatchProfile, draftArticle, followedAuthors, followedTopics, savedListings, savedProducts, savedResumes, savedMatchProfiles, myInvites, sentInvites, studioBalance] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        followingAuthors: { include: { author: true }, orderBy: { createdAt: "desc" }, take: 6 },
        topicFollows: { orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.article.findMany({ where: { createdById: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.listing.findMany({ where: { createdById: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.product.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        priceRub: true,
        city: true,
        status: true,
        expiresAt: true
      }
    }),
    prisma.resume.findUnique({ where: { userId: user.id } }),
    prisma.matchProfile.findUnique({ where: { userId: user.id } }),
    prisma.article.findFirst({ where: { createdById: user.id, status: "DRAFT" }, orderBy: { updatedAt: "desc" } }),
    prisma.follow.findMany({ where: { followerId: user.id }, include: { author: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.topicFollow.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.savedListing.findMany({ where: { userId: user.id }, include: { listing: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.savedProduct.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            category: true,
            priceRub: true,
            city: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.savedResume.findMany({
      where: { userId: user.id },
      include: {
        resume: {
          select: {
            id: true,
            title: true,
            roleGoal: true,
            city: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.savedMatchProfile.findMany({
      where: { userId: user.id },
      include: {
        matchProfile: {
          select: {
            id: true,
            title: true,
            seekerRole: true,
            lookingFor: true,
            city: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.invite.findMany({
      where: { modelId: user.id },
      include: {
        studio: {
          select: { id: true, name: true, email: true, tgHandle: true, violationCount: true }
        },
        resume: {
          select: { id: true, title: true, roleGoal: true, contactEmail: true, contactTelegram: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.invite.findMany({
      where: { studioId: user.id },
      include: {
        model: {
          select: { id: true, name: true, email: true, tgHandle: true }
        },
        resume: {
          select: { id: true, title: true, roleGoal: true, contactEmail: true, contactTelegram: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.studioBalance.findUnique({ where: { userId: user.id } })
  ]);

  if (!dbUser) {
    redirect("/auth/signin");
  }

  const now = new Date();
  const createdParam = searchValue(searchParams?.created);
  const updatedParam = searchValue(searchParams?.updated);
  const articleResultId = searchValue(searchParams?.articleId) || "";
  const listingResultId = searchValue(searchParams?.listingId) || "";
  const matchProfileResultId = searchValue(searchParams?.matchProfileId) || "";
  const resumeResultId = searchValue(searchParams?.resumeId) || "";
  const productResetParam = searchValue(searchParams?.productReset);
  const productError = (searchValue(searchParams?.productError) || "").slice(0, 220);
  const editArticleId = searchValue(searchParams?.editArticle) || "";
  const selectedArticle = editArticleId
    ? myArticles.find((article) => article.id === editArticleId) ?? null
    : null;
  const isEditingArticle = Boolean(selectedArticle);
  const providerMode = dbUser.accountMode === "PROVIDER" || dbUser.accountMode === "BOTH" || dbUser.role === "ADMIN";
  const createdMessage = createdParam ? createdMessages[createdParam] : null;
  const updatedMessage = updatedParam ? updatedMessages[updatedParam] : null;
  const productJustCreated = createdParam === "product";
  const articleJustCreated = createdParam === "article" && Boolean(articleResultId);
  const listingJustCreated = (createdParam === "vacancy" || createdParam === "service" || createdParam === "listing") && Boolean(listingResultId);
  const matchProfileJustCreated = createdParam === "matchProfile" && Boolean(matchProfileResultId);
  const resumeJustSaved = updatedParam === "resume";
  const customSuccessVisible = productJustCreated || articleJustCreated || listingJustCreated || matchProfileJustCreated || resumeJustSaved;
  const productFormKey = productJustCreated
    ? `product-created-${productResetParam || "new"}`
    : productError
      ? `product-error-${productError}`
      : "product-new";
  const inviteResponseParam = searchValue(searchParams?.inviteResponse);
  const inviteReportParam = searchValue(searchParams?.inviteReport);
  const profileName = dbUser.name || dbUser.email || "Профиль";
  const accountModeLabel =
    dbUser.accountMode === "PROVIDER"
      ? "Предлагаю услуги"
      : dbUser.accountMode === "BOTH"
        ? "Ищу и предлагаю"
        : "Ищу услуги / работу";
  const profileKindLabel = profileKindLabels[String(dbUser.profileKind || "MODEL")] || "Профиль";
  const canPublishMatchProfile = dbUser.profileKind === "MODEL" || dbUser.profileKind === "OPERATOR";

  return (
    <div className="space-y-4">
      <CabinetPanelRouter />
      <ProductPublishCleanup active={productJustCreated} />
      <section className="rounded-lg bg-white shadow-sm">
        {/* Top row: avatar + name + quick stats */}
        <div className="flex items-center gap-4 p-4">
          <div className="relative shrink-0">
            {dbUser.image ? (
              <img className="h-14 w-14 rounded-full object-cover" src={dbUser.image} alt={profileName} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-hot text-xl font-black text-white">
                {profileName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{profileName}</h1>
            <p className="truncate text-xs text-zinc-500">{profileKindLabel} &bull; {accountModeLabel}</p>
          </div>
          <a href="#profile" className="shrink-0 rounded-lg border border-zinc-200 p-2 text-zinc-400 hover:text-ink">
            &#9881;&#65039;
          </a>
        </div>

        {/* Stats + Balance in one row */}
        <div className="grid grid-cols-4 gap-px border-t border-zinc-100 bg-zinc-100">
          <div className="bg-white p-3 text-center">
            <p className="text-base font-bold">{myArticles.length}</p>
            <p className="text-[10px] text-zinc-500">статей</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-base font-bold">{myListings.length}</p>
            <p className="text-[10px] text-zinc-500">объявлений</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-base font-bold">{myProducts.length}</p>
            <p className="text-[10px] text-zinc-500">товаров</p>
          </div>
          <div className="bg-white p-3 text-center">
            <p className="text-base font-bold text-emerald-700">${((studioBalance?.availableUsd ?? 0) / 100).toFixed(0)}</p>
            <p className="text-[10px] text-zinc-500">баланс</p>
          </div>
        </div>

        {/* Quick actions — compact pills */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
          <a className="shrink-0 rounded-full bg-hot px-3 py-1.5 text-xs font-semibold text-white" href="/cabinet#blog">Написать</a>
          <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#resume">Резюме</a>
          <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#products">Товар</a>
          {providerMode && <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#vacancy">Вакансия</a>}
          {providerMode && <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#service">Услуга</a>}
          {canPublishMatchProfile && <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#match">Связка</a>}
          <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#materials">Мое</a>
          <a className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700" href="#profile">Профиль</a>
        </div>
      </section>

      <AdBlock placement="cabinet" />

      {inviteResponseParam === "accept" && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Вы приняли инвайт. Контакты студии раскрыты.
        </section>
      )}
      {inviteResponseParam === "decline" && (
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
          Инвайт отклонен. Средства возвращены студии.
        </section>
      )}
      {inviteReportParam === "sent" && (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Жалоба на несоответствие условий отправлена в модерацию.
        </section>
      )}

      <details id="invites" data-cabinet-panel className="group rounded-lg bg-white shadow-sm" open={Boolean(inviteResponseParam || inviteReportParam || searchValue(searchParams?.invited))}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Мои инвайты</h2>
            <p className="mt-1 text-xs text-zinc-500">Входящие и отправленные предложения</p>
          </div>
          {(myInvites.filter((i) => i.status === "PENDING").length + sentInvites.filter((i) => i.status === "ACCEPTED").length) > 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {myInvites.filter((i) => i.status === "PENDING").length + sentInvites.filter((i) => i.status === "ACCEPTED").length} активных
            </span>
          )}
        </summary>
        <div className="border-t border-zinc-100 p-4 space-y-4">
          {myInvites.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Входящие — предложения вам</p>
              <div className="space-y-3">
                {myInvites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} />
                ))}
              </div>
            </div>
          )}
          {sentInvites.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Отправленные — ваши запросы</p>
              <div className="space-y-3">
                {sentInvites.map((invite) => {
                  const statusLabel = invite.status === "PENDING" ? "Ожидает ответа" : invite.status === "ACCEPTED" ? "Контакт получен" : invite.status === "DECLINED" ? "Отклонено" : "Истекло";
                  const statusColor = invite.status === "PENDING" ? "bg-amber-100 text-amber-800" : invite.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600";
                  const costLabel = `$${(invite.amountUsd / 100).toFixed(0)}`;
                  const modelContact = invite.status === "ACCEPTED" ? [invite.resume.contactTelegram, invite.resume.contactEmail].filter(Boolean).join(" • ") : null;
                  return (
                    <div key={invite.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${statusColor}`}>{statusLabel}</span>
                        <span className="text-zinc-500">{costLabel}</span>
                        <span className="text-zinc-400">{invite.createdAt.toLocaleDateString("ru-RU")}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{invite.resume.title}</p>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{invite.message}</p>
                      {modelContact && (
                        <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm">
                          <span className="text-xs font-bold text-emerald-700">Контакт:</span>{" "}
                          <span className="font-semibold text-emerald-900">{modelContact}</span>
                        </div>
                      )}
                      {invite.status === "PENDING" && (
                        <p className="mt-2 text-xs text-amber-600">Ожидайте решения. Если модель не ответит в течение 72ч — деньги вернутся.</p>
                      )}
                      {invite.status === "DECLINED" && (
                        <div className="mt-2">
                          {invite.declineReason && (
                            <div className="rounded-lg bg-zinc-50 p-2 mb-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Причина отклонения</p>
                              <p className="mt-0.5 text-xs text-zinc-700">{invite.declineReason}</p>
                            </div>
                          )}
                          <p className="text-xs text-zinc-500">Средства возвращены на ваш баланс.</p>
                        </div>
                      )}
                      {invite.status === "EXPIRED" && (
                        <p className="mt-2 text-xs text-zinc-500">Время ответа истекло. Средства возвращены.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {myInvites.length === 0 && sentInvites.length === 0 && (
            <p className="text-sm text-zinc-500">Пока нет инвайтов. Здесь будут входящие предложения по вашему резюме и отправленные вами запросы на контакты.</p>
          )}
        </div>
      </details>


      {((createdMessage && !customSuccessVisible) || (updatedMessage && !customSuccessVisible)) && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {createdMessage || updatedMessage}
        </section>
      )}

      <details id="profile" data-cabinet-panel className="group rounded-lg bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Профиль</h2>
            <p className="mt-1 text-xs text-zinc-500">Аватар, имя, описание, тип и режим</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 group-open:bg-zinc-900 group-open:text-white">&#9881;</span>
        </summary>
        <div className="border-t border-zinc-100 p-4 space-y-4">
          <form action={updatePublicProfileAction} className="space-y-3">
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              {dbUser.image ? (
                <img className="h-16 w-16 rounded-full object-cover" src={dbUser.image} alt="" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hot text-2xl font-black text-white">
                  {(dbUser.name || "U").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <label className="inline-flex cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Загрузить фото
                  <input type="file" name="avatarFile" accept="image/*" className="hidden" />
                </label>
                <p className="mt-1 text-xs text-zinc-400">JPG, PNG или WebP до 2 МБ</p>
              </div>
            </div>
            <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" name="name" defaultValue={dbUser.name ?? ""} placeholder="Имя или псевдоним" required />
            <textarea className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" name="profileBio" defaultValue={dbUser.profileBio ?? ""} placeholder="Пару слов о себе" rows={3} />
            <button className="w-full rounded-lg bg-hot py-2 text-sm font-semibold text-white" type="submit">Сохранить</button>
          </form>

          <form action={updateProfileSettingsAction} className="space-y-3 border-t border-zinc-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Тип и режим</p>
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" name="accountMode" defaultValue={dbUser.accountMode}>
                <option value="CONSUMER">Ищу работу</option>
                <option value="PROVIDER">Предлагаю услуги</option>
                <option value="BOTH">Ищу и предлагаю</option>
              </select>
              <select className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" name="profileKind" defaultValue={dbUser.profileKind}>
                <option value="MODEL">Модель</option>
                <option value="OPERATOR">Оператор</option>
                <option value="STUDIO">Студия</option>
                <option value="AGENCY">Агентство</option>
                <option value="EXPERT">Эксперт</option>
                <option value="COACH">Коуч</option>
                <option value="LAWYER">Юрист</option>
                <option value="OTHER">Другое</option>
              </select>
            </div>
            <button className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white" type="submit">Обновить режим</button>
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

      {articleJustCreated && (
        <section id="article-result" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Статья опубликована.</p>
          <p className="mt-1 leading-5">Она уже доступна в ленте. Форма статьи закрыта и очищена.</p>
          <a className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" href={`/articles/${articleResultId}`}>
            Открыть статью
          </a>
        </section>
      )}

      <details id="blog" data-cabinet-panel className="group rounded-lg bg-white shadow-sm" open={isEditingArticle}>
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
          {(isEditingArticle || draftArticle) && (
            <div className="mb-3 flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{isEditingArticle ? selectedArticle?.title || "Черновик без названия" : "Есть сохраненный черновик"}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {isEditingArticle ? "Чтобы начать с пустой формы, нажмите «Новая статья»." : "Его можно продолжить отдельно, новая форма ниже останется пустой."}
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
          )}
          <ArticleEditorForm key={articleJustCreated ? `article-created-${articleResultId}` : selectedArticle?.id ?? "new-article"} action={submitBlogArticleAction} draftAction={saveBlogDraftAction} initialDraft={selectedArticle} />
        </div>
      </details>

      {productJustCreated && (
        <section id="products-result" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Ваш товар опубликован.</p>
          <p className="mt-1 leading-5">Он уже доступен в разделе товаров на 30 дней. Форма добавления закрыта, а товар можно открыть или отредактировать в блоке «Мое».</p>
        </section>
      )}

      {productError && (
        <section className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Товар не опубликован.</p>
          <p className="mt-1 leading-5">{productError}</p>
        </section>
      )}

      <details key={productFormKey} id="products" data-cabinet-panel className="group rounded-lg bg-white shadow-sm" open={Boolean(productError)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h2 className="font-semibold">Продать товар</h2>
            <p className="mt-1 text-xs text-zinc-500">Объявление как на Авито: фото, цена, город, описание и контакт</p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-mint px-3 py-1 text-xs font-semibold text-ink">30 дней</span>
        </summary>
        <div className="border-t border-zinc-100 p-4">
          <ProductForm key={productFormKey} action={submitProductAction} />
        </div>
      </details>

      {resumeJustSaved && (
        <section id="resume-result" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Резюме опубликовано.</p>
          <p className="mt-1 leading-5">Оно уже доступно в каталоге на 7 дней. Форма резюме закрыта и сброшена.</p>
          <a className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" href={`/profiles/${dbUser.id}#resume`}>
            Открыть резюме
          </a>
        </section>
      )}

      <ResumeQuizDisclosure key={resumeJustSaved ? `resume-saved-${resumeResultId || "new"}` : "resume-form"} action={createResumeAction} resume={myResume} />

      {matchProfileJustCreated && (
        <section id="match-result" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Анкета опубликована.</p>
          <p className="mt-1 leading-5">Она уже доступна в разделе «Модель оператор» на 14 дней. Форма закрыта и сброшена.</p>
          <a className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" href="/model-operator">
            Открыть раздел
          </a>
        </section>
      )}

      {canPublishMatchProfile ? (
        <details key={matchProfileJustCreated ? `match-created-${matchProfileResultId}` : "match-form"} id="match" data-cabinet-panel className="group rounded-lg bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-semibold">Модель оператор</h2>
              <p className="mt-1 text-xs text-zinc-500">Анкета для поиска связки, бесплатно на 14 дней</p>
            </div>
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-ink">14 дней</span>
          </summary>
          <div className="border-t border-zinc-100 p-3">
            <MatchProfileForm action={submitMatchProfileAction} profile={myMatchProfile} profileKind={String(dbUser.profileKind)} />
          </div>
        </details>
      ) : (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Раздел «Модель оператор» доступен только профилям с типом «Модель» или «Оператор». Тип можно поменять в блоке профиля.
        </section>
      )}

      {providerMode && (
        <>
          {listingJustCreated && (
            <section id="listing-result" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">{createdParam === "service" ? "Услуга опубликована." : "Вакансия опубликована."}</p>
              <p className="mt-1 leading-5">
                {createdParam === "service" ? "Услуга уже доступна в каталоге на 30 дней." : "Вакансия уже доступна в каталоге на 30 дней."} Форма закрыта и сброшена.
              </p>
              <a className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" href={`/listings/${listingResultId}`}>
                {createdParam === "service" ? "Открыть услугу" : "Открыть вакансию"}
              </a>
            </section>
          )}
          <ListingQuizDisclosure key={listingJustCreated && createdParam === "vacancy" ? `vacancy-created-${listingResultId}` : "vacancy-form"} action={submitListingAction} kind="VACANCY" />
          <ListingQuizDisclosure key={listingJustCreated && createdParam === "service" ? `service-created-${listingResultId}` : "service-form"} action={submitListingAction} kind="SERVICE" />
        </>
      )}

      <details id="materials" data-cabinet-panel className="group rounded-lg bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-semibold">Мое</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Статьи, подписки, модель-оператор, товары, вакансии, услуги и сохраненное
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
                        <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href={articleSeoPath(article)}>
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
              <h3 className="text-sm font-semibold">Мое резюме</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myResume ? 1 : 0}</span>
            </div>
            <div className="mt-3">
              {myResume ? (
                <div className="rounded-lg bg-white p-3 text-sm">
                  {resumeJustSaved && (
                    <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Резюме опубликовано. Оно уже доступно в каталоге и будет активно до {formatDeadline(myResume.expiresAt)}.
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{myResume.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {myResume.hiddenByInactivity || (myResume.expiresAt && myResume.expiresAt <= now) ? "Архив" : "Опубликовано"}
                        {" • до "}
                        {formatDeadline(myResume.expiresAt)}
                        {myResume.city ? ` • ${myResume.city}` : ""}
                      </p>
                    </div>
                    <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href="#resume">
                      Редактировать
                    </a>
                  </div>
                  {(myResume.hiddenByInactivity || (myResume.expiresAt && myResume.expiresAt <= now)) && (
                    <form action={renewResumeAction} className="mt-3 border-t border-zinc-100 pt-3">
                      <button className="rounded-lg bg-hot px-3 py-2 text-xs font-semibold text-white" type="submit">
                        Продлить на 7 дней
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Резюме пока нет. Заполните анкету в блоке резюме.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Модель оператор</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myMatchProfile ? 1 : 0}</span>
            </div>
            <div className="mt-3">
              {myMatchProfile ? (
                <div className="rounded-lg bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{myMatchProfile.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {myMatchProfile.status === "ARCHIVED" || (myMatchProfile.expiresAt && myMatchProfile.expiresAt <= now) ? "Архив" : "Опубликовано"}
                        {" • до "}
                        {formatDeadline(myMatchProfile.expiresAt)}
                        {myMatchProfile.city ? ` • ${myMatchProfile.city}` : ""}
                      </p>
                    </div>
                    <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href="#match">
                      Редактировать
                    </a>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                    <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href="/model-operator">
                      Открыть раздел
                    </a>
                    {(myMatchProfile.status === "ARCHIVED" || (myMatchProfile.expiresAt && myMatchProfile.expiresAt <= now)) && (
                      <form action={renewMatchProfileAction}>
                        <button className="rounded-lg bg-hot px-3 py-2 text-xs font-semibold text-white" type="submit">
                          Продлить на 14 дней
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Здесь появится анкета для поиска модели или оператора.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Мои товары</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myProducts.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {myProducts.map((product) => {
                const isExpiredArchive = product.status === "ARCHIVED" && Boolean(product.expiresAt && product.expiresAt <= now);
                return (
                  <div key={product.id} className="rounded-lg bg-white p-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{product.title}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Товар • {isExpiredArchive ? "Архив" : listingStatusLabels[String(product.status)] || String(product.status)}
                              {" • до "}
                              {formatDeadline(product.expiresAt)}
                              {product.city ? ` • ${product.city}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 rounded-lg bg-zinc-900 px-2 py-1 text-xs font-bold text-white">
                            {new Intl.NumberFormat("ru-RU").format(product.priceRub)} ₽
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href={productSeoPath(product)}>
                            Открыть
                          </a>
                          <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href={`/cabinet/products/${product.id}/edit`}>
                            Редактировать
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                      {isExpiredArchive ? (
                        <form action={renewProductAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <button className="rounded-lg bg-hot px-3 py-2 text-xs font-semibold text-white" type="submit">
                            Продлить на 30 дней
                          </button>
                        </form>
                      ) : (
                        <form action={toggleProductVisibilityAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" type="submit">
                            {product.status === "PUBLISHED" ? "Скрыть" : "Опубликовать"}
                          </button>
                        </form>
                      )}
                      <form action={deleteProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <button className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                          Удалить
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
              {myProducts.length === 0 && <p className="text-xs text-zinc-500">Здесь появятся товары, которые вы выставите на продажу.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Мои вакансии и услуги</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{myListings.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {myListings.map((listing) => {
                const isExpiredArchive = listing.status === "ARCHIVED" && Boolean(listing.expiresAt && listing.expiresAt <= now);
                return (
                  <div key={listing.id} className="rounded-lg bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{listing.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {listing.type === "VACANCY" ? "Вакансия" : "Услуга"} • {isExpiredArchive ? "Архив" : listingStatusLabels[String(listing.status)] || String(listing.status)}
                            {" • до "}
                            {formatDeadline(listing.expiresAt)}
                            {listing.city ? ` • ${listing.city}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <a className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" href={listingSeoPath(listing)}>
                            Открыть
                          </a>
                          <a className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700" href={`/cabinet/listings/${listing.id}/edit`}>
                            Редактировать
                          </a>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                        {isExpiredArchive ? (
                          <form action={renewListingAction}>
                            <input type="hidden" name="listingId" value={listing.id} />
                            <button className="rounded-lg bg-hot px-3 py-2 text-xs font-semibold text-white" type="submit">
                              Продлить на 30 дней
                            </button>
                          </form>
                        ) : (
                          <form action={toggleListingVisibilityAction}>
                            <input type="hidden" name="listingId" value={listing.id} />
                            <button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800" type="submit">
                              {listing.status === "PUBLISHED" ? "Скрыть" : "Опубликовать"}
                            </button>
                          </form>
                        )}
                        <form action={deleteListingAction}>
                          <input type="hidden" name="listingId" value={listing.id} />
                          <button className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" type="submit">
                            Удалить
                          </button>
                        </form>
                      </div>
                  </div>
                );
              })}
              {myListings.length === 0 && <p className="text-xs text-zinc-500">Здесь появятся ваши вакансии и услуги.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Избранные вакансии и услуги</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{savedListings.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedListings.map((item) => (
                <a key={item.id} className="block rounded-lg bg-white p-3 text-sm hover:text-hot" href={listingSeoPath(item.listing)}>
                  <p className="truncate font-medium">{item.listing.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{item.listing.type === "VACANCY" ? "Вакансия" : "Услуга"}</p>
                </a>
              ))}
              {savedListings.length === 0 && <p className="text-xs text-zinc-500">Пока ничего не добавлено в избранное.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Сохраненные товары</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{savedProducts.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedProducts.map((item) => (
                <a key={item.id} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm hover:text-hot" href={productSeoPath(item.product)}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.product.title}</span>
                    <span className="mt-1 block text-xs text-zinc-500">{item.product.category}</span>
                  </span>
                </a>
              ))}
              {savedProducts.length === 0 && <p className="text-xs text-zinc-500">Пока нет сохраненных товаров.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Избранные резюме</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{savedResumes.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedResumes.map((item) => (
                <a key={item.id} className="block rounded-lg bg-white p-3 text-sm hover:text-hot" href={resumeSeoPath(item.resume)}>
                  <p className="truncate font-medium">{item.resume.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.resume.roleGoal}
                    {item.resume.city ? ` • ${item.resume.city}` : ""}
                  </p>
                </a>
              ))}
              {savedResumes.length === 0 && <p className="text-xs text-zinc-500">Пока нет сохраненных резюме.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Избранное модель оператор</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">{savedMatchProfiles.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {savedMatchProfiles.map((item) => (
                <a key={item.id} className="block rounded-lg bg-white p-3 text-sm hover:text-hot" href={matchProfileSeoPath(item.matchProfile)}>
                  <p className="truncate font-medium">{item.matchProfile.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.matchProfile.seekerRole === "MODEL" ? "Модель" : "Оператор"} ищет {item.matchProfile.lookingFor === "MODEL" ? "модель" : item.matchProfile.lookingFor === "OPERATOR" ? "оператора" : "связку"}
                    {item.matchProfile.city ? ` • ${item.matchProfile.city}` : ""}
                  </p>
                </a>
              ))}
              {savedMatchProfiles.length === 0 && <p className="text-xs text-zinc-500">Пока нет сохраненных анкет модель-оператор.</p>}
            </div>
          </div>
          </div>
        </div>
      </details>

    </div>
  );
}
