import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { addListingReviewAction, reportContentAction, respondToListingAction, saveListingAction } from "@/app/actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";
import { maskContact } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function findListing(slug: string) {
  return prisma.listing.findFirst({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ slug }, { id: slug }] },
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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const listing = await findListing(params.slug);
  if (!listing) return { title: "Размещение не найдено", robots: { index: false, follow: false } };
  const title = `${listing.title} — ${listing.type === "VACANCY" ? "вакансия" : "услуга"}`;
  const description = truncateSeo(listing.description);

  return {
    title,
    description,
    alternates: { canonical: `/listings/${listing.id}` },
    openGraph: { title, description, url: `/listings/${listing.id}` }
  };
}

export default async function ListingDetailsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { reported?: string };
}) {
  const session = await auth();
  const listing = await findListing(params.slug);
  if (!listing) notFound();

  await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } });

  const typeLabel = listing.type === "VACANCY" ? "Вакансия" : "Услуга";
  const listingPath = `/listings/${listing.id}`;
  const visibleRatings = listing.reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = visibleRatings.length ? visibleRatings.reduce((sum, rating) => sum + rating, 0) / visibleRatings.length : 0;
  const isServiceOwner = Boolean(session?.user?.id && session.user.id === listing.createdById);

  return (
    <article className="bg-white p-6 shadow-sm">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: listing.title,
            description: listing.description,
            datePosted: listing.createdAt.toISOString(),
            url: siteUrl(`/listings/${listing.id}`).toString(),
            hiringOrganization: {
              "@type": "Organization",
              name: listing.createdBy.name || listing.createdBy.email || "Автор WebcamExpert"
            },
            jobLocationType: listing.employmentType === "REMOTE" ? "TELECOMMUTE" : undefined
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
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">{listing.title}</h1>
      <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-zinc-800">{listing.description}</p>
      {searchParams?.reported && (
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2 text-sm text-zinc-600">
        <span>{listing.viewCount + 1} просмотров</span>
        <span>{listing.responseCount} откликов</span>
        <span>{listing.savedBy.length} сохранений</span>
        {listing.type === "SERVICE" && visibleRatings.length > 0 && <span>Рейтинг: {averageRating.toFixed(1)} из 5</span>}
      </div>
      <p className="mt-4 text-sm font-medium">Контакт: {session?.user ? listing.contact : maskContact(listing.contact)}</p>
      {!session?.user && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью и отправить отклик.</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <form action={respondToListingAction}><input type="hidden" name="listingId" value={listing.id} /><button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" type="submit">Откликнуться</button></form>
        <form action={saveListingAction}><input type="hidden" name="listingId" value={listing.id} /><button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800" type="submit">Сохранить</button></form>
        <form action={reportContentAction}><input type="hidden" name="targetType" value="LISTING" /><input type="hidden" name="targetId" value={listing.id} /><input type="hidden" name="reason" value="Жалоба на размещение" /><input type="hidden" name="next" value={listingPath} /><button className="rounded-lg bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-600" type="submit">Пожаловаться</button></form>
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
            <form action={addListingReviewAction} className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-4">
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
