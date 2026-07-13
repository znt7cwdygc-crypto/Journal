import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DirectoryFilterSidebar, type DirectoryFilterGroup } from "@/components/directory-filter-sidebar";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { audienceOptions, workFormatOptions } from "@/lib/directory-labels";
import { distinctDirectoryCities, listDirectoryProfiles, type DirectoryHubFilters } from "@/lib/directory-queries";
import { usefulArticleCounts, rankDirectoryProfiles } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { siteUrl } from "@/lib/seo";
import { slugifyTranslit } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

const percentSteps = [30, 40, 50, 60, 70, 80];

type SearchParams = {
  city?: string;
  format?: string;
  audience?: string;
  minPercent?: string;
  trainer?: string;
  vacancies?: string;
  verified?: string;
  sort?: string;
};

function hasActiveFilters(searchParams?: SearchParams) {
  return Boolean(
    searchParams?.city || searchParams?.format || searchParams?.audience || searchParams?.minPercent || searchParams?.trainer || searchParams?.vacancies || searchParams?.verified
  );
}

export async function generateMetadata({ searchParams }: { searchParams?: SearchParams }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };
  return {
    title: "Вебкам-студии — каталог с условиями и фильтрами | MyCamDesk",
    description: "Каталог вебкам-студий: город, процент модели, формат работы, обучение и вакансии. Сравнивайте реальные условия перед откликом.",
    alternates: { canonical: "/studios" },
    openGraph: { title: "Каталог вебкам-студий", description: "Условия студий: процент, формат, обучение, вакансии.", url: "/studios" },
    robots: hasActiveFilters(searchParams) ? { index: false, follow: true } : undefined
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

  const [profiles, allProfiles, cities] = await Promise.all([
    listDirectoryProfiles("STUDIO", filters),
    listDirectoryProfiles("STUDIO", {}),
    distinctDirectoryCities("STUDIO")
  ]);
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  let ranked = rankDirectoryProfiles(profiles, usefulCounts);
  if (searchParams?.sort === "percent") ranked = [...ranked].sort((a, b) => (b.percentMin ?? -1) - (a.percentMin ?? -1));
  if (searchParams?.sort === "new") ranked = [...ranked].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const percents = allProfiles.map((p) => p.percentMin).filter((v): v is number => v != null);
  const avgPercent = percents.length ? Math.round(percents.reduce((sum, v) => sum + v, 0) / percents.length) : null;
  const fullProfileCount = allProfiles.filter((p) => p.profileCompleteness >= 70).length;
  const cityCounts = new Map<string, number>();
  for (const p of allProfiles) if (p.city) cityCounts.set(p.city, (cityCounts.get(p.city) || 0) + 1);
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) currentParams.set(key, value);
  }
  const currentPath = `/studios${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;

  const filterGroups: DirectoryFilterGroup[] = [
    { type: "chips", name: "city", label: "Город", value: searchParams?.city || "", options: [{ value: "", label: "Все" }, { value: "online", label: "Онлайн" }, ...cities.map((city) => ({ value: city, label: city }))] },
    { type: "range", name: "minPercent", label: "Процент модели, от", min: percentSteps[0], max: percentSteps[percentSteps.length - 1], step: 10, value: searchParams?.minPercent ? Number(searchParams.minPercent) : percentSteps[0], formatValue: (v) => `${v}%` },
    { type: "chips", name: "format", label: "Формат", value: searchParams?.format || "", options: [{ value: "", label: "Любой" }, ...workFormatOptions] },
    { type: "chips", name: "audience", label: "Набирают", value: searchParams?.audience || "", options: [{ value: "", label: "Любой" }, ...audienceOptions] },
    { type: "switch", name: "trainer", label: "Есть тренер", value: searchParams?.trainer === "1" },
    { type: "switch", name: "vacancies", label: "Есть вакансии", value: searchParams?.vacancies === "1" },
    { type: "switch", name: "verified", label: "Только проверенные", value: searchParams?.verified === "1" }
  ];

  const sortOptions = [
    { key: "rating", label: "По рейтингу" },
    { key: "percent", label: "По проценту" },
    { key: "new", label: "Новые профили" }
  ];
  const activeSort = sortOptions.some((o) => o.key === searchParams?.sort) ? searchParams!.sort! : "rating";

  return (
    <div>
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex rounded bg-hot px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white">Каталог</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[26px]">Вебкам-студии: условия из первых рук</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Карточки заполняют сами студии — процент, штрафы, команда, а не строчка в общем списке. Редакция проверяет контакты. Фильтруйте по городу, проценту и условиям.
            </p>
          </div>
          <Link href="/cabinet/organization" className="btn btn-primary shrink-0">Добавить студию</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{allProfiles.length}</b>студии</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{cities.length}</b>города</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{avgPercent != null ? `${avgPercent}%` : "—"}</b>средний процент</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{fullProfileCount}</b>с полным профилем</div>
        </div>
      </section>

      {topCities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {topCities.map(([city, count]) => (
            <Link key={city} href={`/studios/${slugifyTranslit(city)}`} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:border-hot">
              📍 <b className="text-zinc-900">{city}</b> · {count}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_1fr]">
        <DirectoryFilterSidebar basePath="/studios" groups={filterGroups} />

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600"><b className="text-zinc-900">{ranked.length}</b> {ranked.length === 1 ? "студия найдена" : "студий найдено"}</p>
            <div className="flex gap-1.5 text-xs">
              {sortOptions.map((option) => {
                const params = new URLSearchParams(currentParams);
                if (option.key === "rating") params.delete("sort");
                else params.set("sort", option.key);
                const href = `/studios${params.toString() ? `?${params.toString()}` : ""}`;
                return (
                  <Link key={option.key} href={href} className={`rounded-lg px-3 py-1.5 font-semibold ${activeSort === option.key ? "bg-ink text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {ranked.length === 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-5">
              <h2 className="font-medium">Под выбранные фильтры студий пока нет</h2>
              <p className="mt-2 text-sm text-zinc-600">Попробуйте изменить фильтры или загляните позже.</p>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {ranked.map((profile) => (
              <DirectoryHubCard
                key={profile.id}
                profile={{ ...profile, vacancyCount: profile.owner._count.listings }}
                currentPath={currentPath}
                isSaved={Boolean(session?.user?.id && profile.savedBy.some((item) => item.userId === session.user.id))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
