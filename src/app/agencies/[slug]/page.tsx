import { safeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { OrganizationProfileView } from "@/components/organization-profile-view";
import { platformLabel } from "@/lib/directory-labels";
import {
  distinctDirectoryPlatforms,
  findDirectoryProfile,
  findDirectoryProfileWithFullOwner,
  listDirectoryProfiles
} from "@/lib/directory-queries";
import { buildFaq } from "@/lib/directory-faq";
import { rankDirectoryProfiles, usefulArticleCounts } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";
import { directoryProfileSeoPath, pathTail } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

const PLATFORM_INDEX_THRESHOLD = 3;

async function resolvePlatformSlug(slug: string) {
  const platforms = await distinctDirectoryPlatforms("AGENCY");
  const match = platforms.find((platform) => platform.toLowerCase() === slug.toLowerCase());
  return match || null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };

  const profile = await findDirectoryProfile(params.slug, "AGENCY");
  if (profile) {
    const title = `${profile.name} — агентство контент-платформ`;
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

  const platform = await resolvePlatformSlug(params.slug);
  if (!platform) return { title: "Страница не найдена", robots: { index: false, follow: false } };

  const count = await prisma.directoryProfile.count({ where: { type: "AGENCY", status: "PUBLISHED", platforms: { has: platform } } });
  const indexable = count >= PLATFORM_INDEX_THRESHOLD;
  const label = platformLabel(platform);

  return {
    title: `Агентства ${label} — условия и сравнение`,
    description: `Каталог агентств, работающих с ${label}: доля, что входит в услугу, вакансии.`,
    alternates: { canonical: `/agencies/${params.slug}` },
    robots: indexable ? undefined : { index: false, follow: true }
  };
}

export default async function AgencySlugPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { follow?: string; reported?: string; favorite?: string };
}) {
  if (!isCatalogEnabled()) notFound();

  const session = await auth();
  const profile = await findDirectoryProfile(params.slug, "AGENCY");

  if (profile) {
    const path = directoryProfileSeoPath(profile);
    if (pathTail(path) !== params.slug) redirect(path);

    const fullProfile = await findDirectoryProfileWithFullOwner(params.slug, "AGENCY");
    if (!fullProfile) notFound();

    await prisma.directoryProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 } } });

    const isFollowing =
      session?.user && session.user.id !== fullProfile.ownerId
        ? await prisma.follow.findUnique({ where: { followerId_authorId: { followerId: session.user.id, authorId: fullProfile.ownerId } } })
        : null;

    const faq = buildFaq(profile);
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: profile.name,
      description: truncateSeo(profile.description, 300),
      url: siteUrl(path).toString(),
      image: profile.logoUrl || undefined
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
                { "@type": "ListItem", position: 2, name: "Агентства", item: siteUrl("/agencies").toString() },
                { "@type": "ListItem", position: 3, name: profile.name }
              ]
            })
          }}
        />
        <OrganizationProfileView profile={fullProfile} session={session} isFollowing={Boolean(isFollowing)} searchParams={searchParams} />
      </>
    );
  }

  const platform = await resolvePlatformSlug(params.slug);
  if (!platform) notFound();

  const label = platformLabel(platform);
  const profiles = await listDirectoryProfiles("AGENCY", { platform });
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  const ranked = rankDirectoryProfiles(profiles, usefulCounts);
  const indexable = ranked.length >= PLATFORM_INDEX_THRESHOLD;
  const currentPath = `/agencies/${params.slug}`;
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
                name: `Агентства ${label}`,
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
                  { "@type": "ListItem", position: 2, name: "Агентства", item: siteUrl("/agencies").toString() },
                  { "@type": "ListItem", position: 3, name: label }
                ]
              })
            }}
          />
        </>
      )}
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="eyebrow">Каталог</p>
        <h1 className="page-title mt-1">Агентства {label}</h1>
        {indexable ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {ranked.length} опубликованных агентств работают с {label}: доля, что входит в услугу, платформы и текущие вакансии. Карточки заполняют сами
            агентства, редакция проверяет контакты перед публикацией.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Пока {ranked.length === 0 ? "нет опубликованных агентств" : "мало опубликованных агентств"}, работающих с {label}. Загляните в{" "}
            <Link href="/agencies" className="font-semibold text-hot">общий каталог агентств</Link>.
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
