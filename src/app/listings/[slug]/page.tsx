import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  addListingReviewAction,
  deleteOwnListingReviewAction,
  saveListingAction,
  updateOwnListingReviewAction
} from "@/app/actions";
import { auth } from "@/auth";
import { ContactReveal } from "@/components/contact-reveal";
import { ImportanceBio } from "@/components/importance-bio";
import { ReportButton } from "@/components/report-button";
import { prisma } from "@/lib/prisma";
import { siteName, siteUrl, truncateSeo } from "@/lib/seo";
import { idFromSeoParam, listingSeoPath, pathTail } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

async function findListing(slug: string) {
  const resolved = idFromSeoParam(slug);
  return prisma.listing.findFirst({
    where: {
      status: "PUBLISHED",
      AND: [
        {
          OR: [
            { slug },
            ...(resolved.id ? [{ id: resolved.id }] : []),
            ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
            { id: slug }
          ]
        },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    },
    include: {
      createdBy: true,
      savedBy: true,
      reviews: {
        where: { parentId: null, isHidden: false },
        include: {
          user: true,
          replies: { where: { isHidden: false }, include: { user: true }, orderBy: { createdAt: "asc" } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

function reviewerName(user: { name: string | null; email: string | null }) {
  return user.name || user.email || "Пользователь";
}

function structuredValue(text: string, label: string) {
  const line = text.split("\n").find((item) => item.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function structuredBlocks(text: string) {
  const values: Record<string, string> = {};

  for (const part of text.split(/\n{2,}/)) {
    const index = part.indexOf(":");
    if (index <= 0) continue;
    const label = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (label && value) values[label] = value;
  }

  return values;
}

function serviceSummary(description: string) {
  const summary = structuredValue(description, "Коротко");
  if (summary) return summary;

  return (
    description
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part && !/^(категория|цена|комментарий к цене|что входит|опыт|портфолио|срок|доступность|ограничения):/i.test(part)) ||
    description
  );
}

function vacancyStructuredText(description: string) {
  const data = structuredBlocks(description);
  const lines = [
    "О ВАКАНСИИ",
    data["Роль"] ? `Роль: ${data["Роль"]}` : null,
    data["График"] ? `График: ${data["График"]}` : null,
    data["Занятость"] ? `Занятость: ${data["Занятость"]}` : null,
    "",
    "ОПЛАТА",
    data["Оплата"] ? `Оплата: ${data["Оплата"]}` : null,
    data["Комментарий к оплате"] ? `Выплаты: ${data["Комментарий к оплате"]}` : null,
    "",
    "ТРЕБОВАНИЯ",
    data["Требования"] || null,
    "",
    "УСЛОВИЯ",
    data["Условия"] ? `Условия: ${data["Условия"]}` : null,
    data["Дополнительные условия"] ? `О работодателе: ${data["Дополнительные условия"]}` : null,
    data["Кто не подойдет"] ? `Жесткие фильтры: ${data["Кто не подойдет"]}` : null,
    "",
    "КОРОТКО",
    data["Коротко"] || null
  ].filter((line) => line !== null);

  return lines.join("\n").trim() || description;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await findListing(params.slug);
  if (!listing) return { title: "Размещение не найдено", robots: { index: false, follow: false } };
  const title = `${listing.title} — ${listing.type === "VACANCY" ? "вакансия" : "услуга"}`;
  const description = truncateSeo(listing.description);
  const canonicalPath = listingSeoPath(listing);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, url: canonicalPath }
  };
}

export default async function ListingDetailsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { reported?: string; review?: string; favorite?: string };
}) {
  const session = await auth();
  const listing = await findListing(params.slug);
  if (!listing) notFound();

  const listingPath = listingSeoPath(listing);
  if (pathTail(listingPath) !== params.slug) {
    redirect(listingPath);
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } });

  const typeLabel = listing.type === "VACANCY" ? "Вакансия" : "Услуга";
  const visibleRatings = listing.reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = visibleRatings.length ? visibleRatings.reduce((sum, rating) => sum + rating, 0) / visibleRatings.length : 0;
  const isServiceOwner = Boolean(session?.user?.id && session.user.id === listing.createdById);
  const isService = listing.type === "SERVICE";
  const isSaved = Boolean(session?.user?.id && listing.savedBy.some((item) => item.userId === session.user.id));
  const price = isService ? structuredValue(listing.description, "Цена") : "";
  const summary = isService ? serviceSummary(listing.description) : listing.description;
  const vacancyText = !isService ? vacancyStructuredText(listing.description) : "";
  const listingJsonLd = isService
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        name: listing.title,
        description: summary,
        areaServed: listing.city || (listing.employmentType === "REMOTE" ? "Online" : "Russia"),
        provider: {
          "@type": "Person",
          name: listing.createdBy.name || listing.createdBy.email || "Автор MyCamDesk"
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "RUB",
          price: price ? price.replace(/[^\d]/g, "") || undefined : undefined,
          availability: "https://schema.org/InStock",
          url: siteUrl(listingPath).toString()
        }
      }
    : {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: listing.title,
        description: listing.description,
        datePosted: listing.createdAt.toISOString(),
        validThrough: listing.expiresAt?.toISOString(),
        employmentType: listing.employmentType || undefined,
        identifier: {
          "@type": "PropertyValue",
          name: siteName,
          value: listing.id
        },
        url: siteUrl(listingPath).toString(),
        hiringOrganization: {
          "@type": "Organization",
          name: listing.createdBy.name || listing.createdBy.email || "Автор MyCamDesk",
          sameAs: siteUrl("/").toString()
        },
        jobLocationType: listing.employmentType === "REMOTE" ? "TELECOMMUTE" : undefined,
        applicantLocationRequirements:
          listing.employmentType === "REMOTE"
            ? {
                "@type": "Country",
                name: "RU"
              }
            : undefined,
        jobLocation:
          listing.employmentType === "REMOTE"
            ? undefined
            : {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: listing.city || "Россия",
                  addressCountry: "RU"
                }
              }
      };
  const reviewMessage =
    searchParams?.review === "added"
      ? "Отзыв опубликован."
      : searchParams?.review === "updated"
        ? "Отзыв обновлен."
        : searchParams?.review === "deleted"
          ? "Отзыв удален."
          : null;
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? isService
        ? "Услуга добавлена в избранное."
        : "Вакансия добавлена в избранное."
      : searchParams?.favorite === "removed"
        ? isService
          ? "Услуга убрана из избранного."
          : "Вакансия убрана из избранного."
        : null;

  return (
    <article className="bg-white p-6 shadow-sm">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...listingJsonLd
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
              { "@type": "ListItem", "position": 2, "name": listing.type === "VACANCY" ? "Вакансии" : "Услуги", "item": siteUrl(listing.type === "VACANCY" ? "/vacancies" : "/services").toString() },
              { "@type": "ListItem", "position": 3, "name": listing.title }
            ]
          })
        }}
      />
      <Link className="text-sm font-semibold text-accent" href={listing.type === "VACANCY" ? "/vacancies" : "/services"}>
        Назад к разделу
      </Link>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-hot px-3 py-1 font-semibold text-white">{typeLabel}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{listing.city || "Город не указан"}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{listing.employmentType || "Формат не указан"}</span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{listing.title}</h1>
      {price && <p className="mt-4 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-lg font-bold text-white">{price}</p>}
      {isService && summary !== listing.description && <p className="mt-4 text-lg leading-7 text-zinc-700">{summary}</p>}
      {isService ? (
        <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-zinc-800">{listing.description}</p>
      ) : (
        <ImportanceBio text={vacancyText} />
      )}
      {searchParams?.reported && (
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </div>
      )}
      {favoriteMessage && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {favoriteMessage}
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2 text-sm text-zinc-600">
        <span>{listing.viewCount + 1} просмотров</span>
        <span>{listing.responseCount} откликов</span>
        <span>{listing.savedBy.length} в избранном</span>
        {listing.type === "SERVICE" && visibleRatings.length > 0 && <span>Рейтинг: {averageRating.toFixed(1)} из 5</span>}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <ContactReveal contact={listing.contact} signedIn={Boolean(session?.user)} compact />
        <form action={saveListingAction}><input type="hidden" name="listingId" value={listing.id} /><input type="hidden" name="next" value={listingPath} /><button className="h-10 w-full rounded-lg bg-zinc-100 px-1 text-[11px] font-semibold text-zinc-800" type="submit">{isSaved ? "Убрать" : "В избранное"}</button></form>
        <ReportButton
          targetType="LISTING"
          targetId={listing.id}
          next={listingPath}
          buttonClassName="h-10 w-full rounded-lg bg-red-50 px-1 text-[11px] font-semibold text-red-700"
        />
      </div>

      <Link href={`/profiles/${listing.createdById}`} className="mt-6 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm hover:bg-zinc-100">
        {listing.createdBy.image ? (
          <img className="h-10 w-10 rounded object-cover" src={listing.createdBy.image} alt={listing.createdBy.name || "Аватар автора"} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
            {(listing.createdBy.name || listing.createdBy.email || "A").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <span className="block font-medium text-zinc-900">{listing.createdBy.name || listing.createdBy.email || "Профиль автора"}</span>
          {listing.createdBy.profileBio && <span className="block text-xs leading-5 text-zinc-600">{listing.createdBy.profileBio}</span>}
        </span>
      </Link>

      {listing.type === "SERVICE" && (
        <section id="reviews" className="mt-8 border-t border-zinc-100 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Отзывы</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {visibleRatings.length > 0 ? `Средняя оценка ${averageRating.toFixed(1)} из 5, отзывов: ${visibleRatings.length}` : "Пока нет отзывов. Можно быть первым."}
              </p>
            </div>
          </div>

          {!session?.user && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
              <Link className="font-semibold text-accent" href="/auth/signin">Войдите</Link>, чтобы оставить отзыв об услуге.
            </div>
          )}

          {session?.user && !isServiceOwner && (
            <details className="mt-4 rounded-lg border border-zinc-200 bg-white">
              <summary className="cursor-pointer list-none rounded-lg px-4 py-3 text-sm font-semibold text-zinc-900">
                Оставить отзыв
              </summary>
              <form action={addListingReviewAction} className="space-y-3 border-t border-zinc-100 p-4">
                <input type="hidden" name="listingId" value={listing.id} />
                <label className="block text-sm font-semibold text-zinc-800">
                  Оценка
                  <select name="rating" className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2" defaultValue="5" required>
                    <option value="5">5 - отлично</option>
                    <option value="4">4 - хорошо</option>
                    <option value="3">3 - нормально</option>
                    <option value="2">2 - слабо</option>
                    <option value="1">1 - плохо</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold text-zinc-800">
                  Отзыв
                  <textarea name="body" className="mt-1 min-h-28 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-6" placeholder="Что понравилось, что можно улучшить, был ли результат" required />
                </label>
                <button className="btn btn-primary" type="submit">Опубликовать отзыв</button>
              </form>
            </details>
          )}

          {reviewMessage && (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {reviewMessage}
            </div>
          )}

          {isServiceOwner && <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">Автор услуги не может оставить отзыв себе, но может отвечать клиентам.</p>}

          <div className="mt-5 space-y-4">
            {listing.reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-zinc-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-zinc-900">{reviewerName(review.user)}</span>
                  <span className="text-xs text-zinc-500">{review.createdAt.toLocaleDateString("ru-RU")}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-accent">Оценка: {review.rating} из 5</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{review.body}</p>

                {session?.user?.id === review.userId && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                    <details>
                      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">Редактировать отзыв</summary>
                      <form action={updateOwnListingReviewAction} className="mt-3 space-y-2">
                        <input type="hidden" name="reviewId" value={review.id} />
                        <select name="rating" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" defaultValue={String(review.rating || 5)} required>
                          <option value="5">5 - отлично</option>
                          <option value="4">4 - хорошо</option>
                          <option value="3">3 - нормально</option>
                          <option value="2">2 - слабо</option>
                          <option value="1">1 - плохо</option>
                        </select>
                        <textarea name="body" className="min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-6" defaultValue={review.body} required />
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-primary" type="submit">Сохранить</button>
                        </div>
                      </form>
                    </details>
                    <form action={deleteOwnListingReviewAction} className="mt-2">
                      <input type="hidden" name="reviewId" value={review.id} />
                      <button className="btn btn-danger" type="submit">Удалить отзыв</button>
                    </form>
                  </div>
                )}

                {review.replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-zinc-100 pl-3">
                    {review.replies.map((reply) => (
                      <div key={reply.id} className="rounded bg-zinc-50 p-3 text-sm">
                        <p className="font-semibold text-zinc-900">Ответ автора: {reviewerName(reply.user)}</p>
                        <p className="mt-1 whitespace-pre-wrap leading-6 text-zinc-700">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isServiceOwner && (
                  <form action={addListingReviewAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="listingId" value={listing.id} />
                    <input type="hidden" name="parentId" value={review.id} />
                    <input className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm" name="body" placeholder="Ответить на отзыв" required />
                    <button className="btn btn-muted" type="submit">Ответить</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
