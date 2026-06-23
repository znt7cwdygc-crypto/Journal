import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { saveMatchProfileAction } from "@/app/actions";
import { auth } from "@/auth";
import { ContactReveal } from "@/components/contact-reveal";
import { ImportanceBio } from "@/components/importance-bio";
import { ReportButton } from "@/components/report-button";
import { prisma } from "@/lib/prisma";
import { siteName, siteUrl, truncateSeo } from "@/lib/seo";
import { idFromSeoParam, matchProfileSeoPath, pathTail } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  MODEL: "Модель",
  OPERATOR: "Оператор",
  BOTH: "Любой вариант"
};

const formatLabels: Record<string, string> = {
  REMOTE: "Удаленно",
  OFFICE: "В студии",
  HYBRID: "Гибрид"
};

async function findMatchProfile(slug: string) {
  const resolved = idFromSeoParam(slug);
  return prisma.matchProfile.findFirst({
    where: {
      status: "PUBLISHED",
      AND: [
        {
          OR: [
            ...(resolved.id ? [{ id: resolved.id }] : []),
            ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
            { id: slug }
          ]
        },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    },
    include: {
      user: true,
      savedBy: true
    }
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await findMatchProfile(params.slug);
  if (!profile) return { title: "Анкета не найдена", robots: { index: false, follow: false } };
  const canonicalPath = matchProfileSeoPath(profile);
  const title = `${profile.title} — модель оператор`;
  const description = truncateSeo(profile.bio);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath
    }
  };
}

export default async function MatchProfileDetailsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { favorite?: string };
}) {
  const session = await auth();
  const profile = await findMatchProfile(params.slug);
  if (!profile) notFound();

  const profilePath = matchProfileSeoPath(profile);
  if (pathTail(profilePath) !== params.slug) {
    redirect(profilePath);
  }

  await prisma.matchProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 } } });

  const authorName = profile.user.name || profile.user.email || "Профиль";
  const isSaved = Boolean(session?.user?.id && profile.savedBy.some((item) => item.userId === session.user.id));
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Анкета добавлена в избранное."
      : searchParams?.favorite === "removed"
        ? "Анкета убрана из избранного."
        : null;

  return (
    <article className="bg-white p-5 shadow-sm sm:p-6">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            name: profile.title,
            description: truncateSeo(profile.bio),
            url: siteUrl(profilePath).toString(),
            mainEntity: {
              "@type": "Person",
              name: authorName,
              jobTitle: `${roleLabels[profile.seekerRole] || profile.seekerRole} ищет ${roleLabels[profile.lookingFor]?.toLowerCase() || profile.lookingFor}`,
              description: profile.bio,
              image: profile.user.image || undefined,
              address: profile.city
                ? {
                    "@type": "PostalAddress",
                    addressLocality: profile.city,
                    addressCountry: "RU"
                  }
                : undefined
            },
            publisher: {
              "@type": "Organization",
              name: siteName,
              url: siteUrl("/").toString()
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
              { "@type": "ListItem", "position": 2, "name": "Модель оператор", "item": siteUrl("/model-operator").toString() },
              { "@type": "ListItem", "position": 3, "name": profile.title }
            ]
          })
        }}
      />

      <Link className="text-sm font-semibold text-accent" href="/model-operator">Назад к разделу</Link>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-mint px-3 py-1 font-semibold text-ink">{roleLabels[profile.seekerRole] || profile.seekerRole}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-zinc-700">Ищу: {roleLabels[profile.lookingFor] || profile.lookingFor}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{profile.city || "Город не указан"}</span>
      </div>

      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{profile.title}</h1>
      {profile.operatorPercent && (
        <p className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-lg font-bold text-white">
          Оплата: {profile.operatorPercent}
        </p>
      )}

      <ImportanceBio text={profile.bio} />

      <div className="mt-5 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
        <span>Формат: {formatLabels[profile.workFormat] || profile.workFormat}</span>
        <span>Опыт: {profile.experience}</span>
        <span>График: {profile.schedule}</span>
        <span>Часовой пояс: {profile.timezone || "не указан"}</span>
        {profile.currentCheck && <span>Текущий чек: {profile.currentCheck}</span>}
        {profile.niche && <span>Ниша: {profile.niche}</span>}
        <span>Просмотры: {profile.viewCount + 1}</span>
        <span>Отклики: {profile.responseCount}</span>
        <span>до {profile.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</span>
      </div>

      {favoriteMessage && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {favoriteMessage}
        </div>
      )}

      <div className="directory-actions mt-5 grid grid-cols-3 gap-2">
        <ContactReveal contact={profile.contact} signedIn={Boolean(session?.user)} compact />
        <form action={saveMatchProfileAction}>
          <input type="hidden" name="matchProfileId" value={profile.id} />
          <input type="hidden" name="next" value={profilePath} />
          <button className="btn btn-muted h-10 w-full whitespace-nowrap px-1 text-[11px]" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
        <ReportButton
          targetType="MATCH_PROFILE"
          targetId={profile.id}
          next={profilePath}
          buttonClassName="btn btn-danger h-10 w-full whitespace-nowrap px-1 text-[11px]"
        />
      </div>

      <Link href={`/profiles/${profile.userId}`} className="mt-6 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm hover:bg-zinc-100">
        {profile.user.image ? (
          <img className="h-10 w-10 rounded object-cover" src={profile.user.image} alt={authorName} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <span className="block font-medium text-zinc-900">{authorName}</span>
          {profile.user.profileBio && <span className="block text-xs leading-5 text-zinc-600">{profile.user.profileBio}</span>}
        </span>
      </Link>
    </article>
  );
}
