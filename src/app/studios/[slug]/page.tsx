import { safeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { OrganizationProfileView } from "@/components/organization-profile-view";
import { addressRegionForCity } from "@/lib/city-region";
import {
  distinctDirectoryCities,
  findDirectoryProfile,
  findDirectoryProfileWithFullOwner,
  listDirectoryProfiles
} from "@/lib/directory-queries";
import { buildFaq } from "@/lib/directory-faq";
import { rankDirectoryProfiles, usefulArticleCounts } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";
import { directoryProfileSeoPath, pathTail, slugifyTranslit } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

const CITY_INDEX_THRESHOLD = 3;

async function resolveCitySlug(slug: string) {
  if (slug === "online") return { online: true as const, city: null as string | null };
  const cities = await distinctDirectoryCities("STUDIO");
  const match = cities.find((city) => slugifyTranslit(city) === slug);
  return match ? { online: false as const, city: match } : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };

  const profile = await findDirectoryProfile(params.slug, "STUDIO");
  if (profile) {
    const title = `${profile.name} — вебкам-студия ${profile.city ? `в городе ${profile.city}` : "онлайн"}`;
    const description = truncateSeo(profile.summary);
    const canonicalPath = directoryProfileSeoPath(profile);
    const indexable = profile.profileCompleteness >= 70;
    return {
      title,
      description,
      alternates: { canonical: canonicalPath },
      openGraph: { title, description, url: canonicalPath, images: profile.coverUrl ? [profile.coverUrl] : undefined },
      robots: indexable ? undefined : { index: false, follow: true }
    };
  }

  const cityMatch = await resolveCitySlug(params.slug);
  if (!cityMatch) return { title: "Страница не найдена", robots: { index: false, follow: false } };

  const count = await prisma.directoryProfile.count({
    where: { type: "STUDIO", status: "PUBLISHED", city: cityMatch.online ? null : cityMatch.city }
  });
  const label = cityMatch.online ? "работающие онлайн" : cityMatch.city;
  const indexable = count >= CITY_INDEX_THRESHOLD;

  return {
    title: `Вебкам-студии${cityMatch.online ? "" : ` ${label}`} — условия и сравнение`,
    description: `Каталог вебкам-студий${cityMatch.online ? ", работающих онлайн" : ` в городе ${label}`}: процент, формат работы, обучение и вакансии.`,
    alternates: { canonical: `/studios/${params.slug}` },
    robots: indexable ? undefined : { index: false, follow: true }
  };
}

export default async function StudioSlugPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { follow?: string; reported?: string; favorite?: string };
}) {
  if (!isCatalogEnabled()) notFound();

  const session = await auth();
  const profile = await findDirectoryProfile(params.slug, "STUDIO");

  if (profile) {
    const path = directoryProfileSeoPath(profile);
    if (pathTail(path) !== params.slug) redirect(path);

    const fullProfile = await findDirectoryProfileWithFullOwner(params.slug, "STUDIO");
    if (!fullProfile) notFound();

    await prisma.directoryProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 } } });

    const isFollowing =
      session?.user && session.user.id !== fullProfile.ownerId
        ? await prisma.follow.findUnique({ where: { followerId_authorId: { followerId: session.user.id, authorId: fullProfile.ownerId } } })
        : null;

    const faq = buildFaq(profile);
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": profile.addressIsPublic && profile.city ? "LocalBusiness" : "Organization",
      name: profile.name,
      description: truncateSeo(profile.description, 300),
      url: siteUrl(path).toString(),
      image: profile.logoUrl || undefined,
      ...(profile.addressIsPublic && profile.city
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: profile.city,
              addressRegion: addressRegionForCity(profile.city),
              addressCountry: "RU"
            }
          }
        : {})
    };

    return (
      <>
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } }))
            })
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl("/").toString() },
                { "@type": "ListItem", position: 2, name: "Студии", item: siteUrl("/studios").toString() },
                { "@type": "ListItem", position: 3, name: profile.name }
              ]
            })
          }}
        />
        <OrganizationProfileView profile={fullProfile} session={session} isFollowing={Boolean(isFollowing)} searchParams={searchParams} />
      </>
    );
  }

  const cityMatch = await resolveCitySlug(params.slug);
  if (!cityMatch) notFound();

  const label = cityMatch.online ? "Онлайн" : cityMatch.city!;
  const profiles = await listDirectoryProfiles("STUDIO", cityMatch.online ? { online: true } : { city: cityMatch.city! });
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  const ranked = rankDirectoryProfiles(profiles, usefulCounts);
  const indexable = ranked.length >= CITY_INDEX_THRESHOLD;
  const currentPath = `/studios/${params.slug}`;
  const updatedAt = ranked.reduce((latest, p) => (p.updatedAt > latest ? p.updatedAt : latest), new Date(0));

  return (
    <div className="space-y-4">
      {indexable && (
        <>
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: safeJsonLd({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                name: `Вебкам-студии ${label}`,
                url: siteUrl(currentPath).toString(),
                isPartOf: { "@type": "WebSite", name: "MyCamDesk", url: siteUrl("/").toString() }
              })
            }}
          />
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: safeJsonLd({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl("/").toString() },
                  { "@type": "ListItem", position: 2, name: "Студии", item: siteUrl("/studios").toString() },
                  { "@type": "ListItem", position: 3, name: label }
                ]
              })
            }}
          />
        </>
      )}
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="eyebrow">Каталог</p>
        <h1 className="page-title mt-1">Вебкам-студии {label}</h1>
        {indexable ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {ranked.length} {cityMatch.online ? "студий работают онлайн" : `опубликованных студий в городе ${label}`}: условия, процент модели, формат работы
            и текущие вакансии. Карточки заполняют сами студии, редакция проверяет контакты перед публикацией.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Пока {ranked.length === 0 ? "нет опубликованных студий" : "мало опубликованных студий"} {cityMatch.online ? "с онлайн-форматом" : `в городе ${label}`}.
            Загляните в <Link href="/studios" className="font-semibold text-hot">общий каталог студий</Link>.
          </p>
        )}
        {updatedAt.getTime() > 0 && <p className="mt-2 text-xs text-zinc-400">Обновлено: {updatedAt.toLocaleDateString("ru-RU")}</p>}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {ranked.map((p) => (
          <DirectoryHubCard
            key={p.id}
            profile={{ ...p, vacancyCount: p.owner._count.listings }}
            currentPath={currentPath}
            isSaved={Boolean(session?.user?.id && p.savedBy.some((item) => item.userId === session.user.id))}
          />
        ))}
      </section>
    </div>
  );
}
