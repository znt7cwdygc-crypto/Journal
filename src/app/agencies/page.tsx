import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { agencyIncludeOptions, platformLabel } from "@/lib/directory-labels";
import { distinctDirectoryPlatforms, listDirectoryProfiles, type DirectoryHubFilters } from "@/lib/directory-queries";
import { usefulArticleCounts, rankDirectoryProfiles } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const shareOptions = [20, 30, 40, 50];

type SearchParams = {
  platform?: string;
  include?: string;
  maxShare?: string;
  vacancies?: string;
  verified?: string;
};

export async function generateMetadata({ searchParams }: { searchParams?: SearchParams }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };
  const hasFilters = Boolean(searchParams?.platform || searchParams?.include || searchParams?.maxShare || searchParams?.vacancies || searchParams?.verified);
  return {
    title: "Агентства контент-платформ — каталог с условиями | MyCamDesk",
    description: "Каталог агентств OnlyFans, Fansly и других платформ: доля, что входит в услугу, платформы и вакансии.",
    alternates: { canonical: "/agencies" },
    openGraph: { title: "Каталог агентств контент-платформ", description: "Условия агентств: доля, платформы, вакансии.", url: "/agencies" },
    robots: hasFilters ? { index: false, follow: true } : undefined
  };
}

export default async function AgenciesHubPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!isCatalogEnabled()) notFound();

  const session = await auth();
  const filters: DirectoryHubFilters = {
    platform: searchParams?.platform || undefined,
    agencyInclude: searchParams?.include || undefined,
    minPercent: searchParams?.maxShare ? Number(searchParams.maxShare) : undefined,
    hasVacancies: searchParams?.vacancies === "1",
    verifiedOnly: searchParams?.verified === "1"
  };

  const [profiles, platforms] = await Promise.all([listDirectoryProfiles("AGENCY", filters), distinctDirectoryPlatforms("AGENCY")]);
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  const ranked = rankDirectoryProfiles(profiles, usefulCounts);

  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) currentParams.set(key, value);
  }
  const currentPath = `/agencies${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Агентства контент-платформ",
        url: siteUrl("/agencies").toString(),
        isPartOf: { "@type": "WebSite", name: "MyCamDesk", url: siteUrl("/").toString() }
      }) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl("/").toString() },
          { "@type": "ListItem", position: 2, name: "Агентства" }
        ]
      }) }} />
      <CatalogPageHeader
        eyebrow="Каталог"
        title="Агентства контент-платформ"
        description="Условия агентств OnlyFans, Fansly и других платформ: доля, что входит в услугу, платформы и текущие вакансии."
        actionLabel="Добавить агентство"
        actionHref="/cabinet/organization"
      />
      <CatalogFilterForm
        basePath="/agencies"
        filters={[
          {
            name: "platform",
            label: "Платформа",
            value: searchParams?.platform || "",
            options: [{ value: "", label: "Любая" }, ...platforms.map((value) => ({ value, label: platformLabel(value) }))]
          },
          {
            name: "include",
            label: "Что входит",
            value: searchParams?.include || "",
            options: [{ value: "", label: "Любое" }, ...agencyIncludeOptions]
          },
          {
            name: "maxShare",
            label: "Доля не выше",
            value: searchParams?.maxShare || "",
            options: [{ value: "", label: "Любая" }, ...shareOptions.map((value) => ({ value: String(value), label: `до ${value}%` }))]
          },
          {
            name: "vacancies",
            label: "Вакансии",
            value: searchParams?.vacancies || "",
            options: [{ value: "", label: "Неважно" }, { value: "1", label: "Есть вакансии" }]
          },
          {
            name: "verified",
            label: "Проверка",
            value: searchParams?.verified || "",
            options: [{ value: "", label: "Все" }, { value: "1", label: "Только проверенные" }]
          }
        ]}
      />
      <p className="text-sm text-zinc-500">Найдено: {ranked.length}</p>
      {ranked.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Под выбранные фильтры агентств пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте изменить фильтры или загляните позже.</p>
        </section>
      )}
      <section className="grid gap-3 md:grid-cols-2">
        {ranked.map((profile) => (
          <DirectoryHubCard
            key={profile.id}
            profile={{ ...profile, vacancyCount: profile.owner._count.listings, usefulArticleCount: usefulCounts.get(profile.ownerId) || 0 }}
            currentPath={currentPath}
            isSaved={Boolean(session?.user?.id && profile.savedBy.some((item) => item.userId === session.user.id))}
          />
        ))}
      </section>
    </div>
  );
}
