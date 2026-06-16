import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { reportContentAction, respondToListingAction, saveListingAction } from "@/app/actions";
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
    include: { createdBy: true, savedBy: true }
  });
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
    </article>
  );
}
