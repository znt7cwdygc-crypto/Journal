import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { audienceOptions, workFormatOptions } from "@/lib/directory-labels";
import { distinctDirectoryCities, listDirectoryProfiles, type DirectoryHubFilters } from "@/lib/directory-queries";
import { usefulArticleCounts, rankDirectoryProfiles } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const percentOptions = [30, 40, 50, 60, 70];

type SearchParams = {
  city?: string;
  format?: string;
  audience?: string;
  minPercent?: string;
  trainer?: string;
  vacancies?: string;
  verified?: string;
};

export async function generateMetadata({ searchParams }: { searchParams?: SearchParams }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };
  const hasFilters = Boolean(
    searchParams?.city || searchParams?.format || searchParams?.audience || searchParams?.minPercent || searchParams?.trainer || searchParams?.vacancies || searchParams?.verified
  );
  return {
    title: "Вебкам-студии — каталог с условиями и фильтрами | MyCamDesk",
    description: "Каталог вебкам-студий: город, процент модели, формат работы, обучение и вакансии. Сравнивайте реальные условия перед откликом.",
    alternates: { canonical: "/studios" },
    openGraph: { title: "Каталог вебкам-студий", description: "Условия студий: процент, формат, обучение, вакансии.", url: "/studios" },
    robots: hasFilters ? { index: false, follow: true } : undefined
  };
}

export default async function StudiosHubPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!isCatalogEnabled()) notFound();

  const session = await auth();
  const filters: DirectoryHubFilters = {
    city: searchParams?.city && searchParams.city !== "online" ? searchParams.city : undefined,
    online: searchParams?.city === "online",
    workFormat: searchParams?.format || undefined,
    audience: searchParams?.audience || undefined,
    minPercent: searchParams?.minPercent ? Number(searchParams.minPercent) : undefined,
    hasTrainer: searchParams?.trainer === "1",
    hasVacancies: searchParams?.vacancies === "1",
    verifiedOnly: searchParams?.verified === "1"
  };

  const [profiles, cities] = await Promise.all([listDirectoryProfiles("STUDIO", filters), distinctDirectoryCities("STUDIO")]);
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  const ranked = rankDirectoryProfiles(profiles, usefulCounts);

  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) currentParams.set(key, value);
  }
  const currentPath = `/studios${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Вебкам-студии",
        url: siteUrl("/studios").toString(),
        isPartOf: { "@type": "WebSite", name: "MyCamDesk", url: siteUrl("/").toString() }
      }) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl("/").toString() },
          { "@type": "ListItem", position: 2, name: "Студии" }
        ]
      }) }} />
      <CatalogPageHeader
        eyebrow="Каталог"
        title="Вебкам-студии"
        description="Реальные условия студий: процент, формат работы, обучение и текущие вакансии. Карточку заполняет сама студия, редакция проверяет контакты."
        actionLabel="Добавить студию"
        actionHref="/cabinet/organization"
      />
      <CatalogFilterForm
        basePath="/studios"
        filters={[
          {
            name: "city",
            label: "Город",
            value: searchParams?.city || "",
            options: [{ value: "", label: "Все" }, { value: "online", label: "Онлайн" }, ...cities.map((city) => ({ value: city, label: city }))]
          },
          {
            name: "format",
            label: "Формат",
            value: searchParams?.format || "",
            options: [{ value: "", label: "Любой" }, ...workFormatOptions]
          },
          {
            name: "audience",
            label: "Набирают",
            value: searchParams?.audience || "",
            options: [{ value: "", label: "Любой" }, ...audienceOptions]
          },
          {
            name: "minPercent",
            label: "Процент от",
            value: searchParams?.minPercent || "",
            options: [{ value: "", label: "Любой" }, ...percentOptions.map((value) => ({ value: String(value), label: `от ${value}%` }))]
          },
          {
            name: "trainer",
            label: "Обучение",
            value: searchParams?.trainer || "",
            options: [{ value: "", label: "Неважно" }, { value: "1", label: "Есть тренер" }]
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
          <h2 className="font-medium">Под выбранные фильтры студий пока нет</h2>
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
