import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DirectoryFilterSidebar, type DirectoryFilterGroup } from "@/components/directory-filter-sidebar";
import { DirectoryHubCard } from "@/components/directory-hub-card";
import { agencyIncludeOptions, platformLabel } from "@/lib/directory-labels";
import { distinctDirectoryPlatforms, listDirectoryProfiles, type DirectoryHubFilters } from "@/lib/directory-queries";
import { usefulArticleCounts, rankDirectoryProfiles } from "@/lib/directory-ranking";
import { isCatalogEnabled } from "@/lib/features";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const shareSteps = [10, 20, 30, 40, 50];

type SearchParams = {
  platform?: string;
  include?: string;
  maxShare?: string;
  vacancies?: string;
  verified?: string;
  sort?: string;
};

function hasActiveFilters(searchParams?: SearchParams) {
  return Boolean(searchParams?.platform || searchParams?.include || searchParams?.maxShare || searchParams?.vacancies || searchParams?.verified);
}

export async function generateMetadata({ searchParams }: { searchParams?: SearchParams }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };
  return {
    title: "Агентства контент-платформ — каталог с условиями | MyCamDesk",
    description: "Каталог агентств OnlyFans, Fansly и других платформ: доля, что входит в услугу, платформы и вакансии.",
    alternates: { canonical: "/agencies" },
    openGraph: { title: "Каталог агентств контент-платформ", description: "Условия агентств: доля, платформы, вакансии.", url: "/agencies" },
    robots: hasActiveFilters(searchParams) ? { index: false, follow: true } : undefined
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

  const [profiles, allProfiles, platforms] = await Promise.all([
    listDirectoryProfiles("AGENCY", filters),
    listDirectoryProfiles("AGENCY", {}),
    distinctDirectoryPlatforms("AGENCY")
  ]);
  const usefulCounts = await usefulArticleCounts(profiles.map((p) => p.ownerId));
  let ranked = rankDirectoryProfiles(profiles, usefulCounts);
  if (searchParams?.sort === "share") ranked = [...ranked].sort((a, b) => (a.agencySharePercent ?? 999) - (b.agencySharePercent ?? 999));
  if (searchParams?.sort === "new") ranked = [...ranked].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const shares = allProfiles.map((p) => p.agencySharePercent).filter((v): v is number => v != null);
  const avgShare = shares.length ? Math.round(shares.reduce((sum, v) => sum + v, 0) / shares.length) : null;
  const fullProfileCount = allProfiles.filter((p) => p.profileCompleteness >= 70).length;

  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) currentParams.set(key, value);
  }
  const currentPath = `/agencies${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;

  const filterGroups: DirectoryFilterGroup[] = [
    { type: "chips", name: "platform", label: "Платформа", value: searchParams?.platform || "", options: [{ value: "", label: "Любая" }, ...platforms.map((v) => ({ value: v, label: platformLabel(v) }))] },
    { type: "range", name: "maxShare", label: "Доля агентства, до", min: shareSteps[0], max: shareSteps[shareSteps.length - 1], step: 10, value: searchParams?.maxShare ? Number(searchParams.maxShare) : shareSteps[shareSteps.length - 1], formatValue: (v) => `${v}%` },
    { type: "chips", name: "include", label: "Что включено", value: searchParams?.include || "", options: [{ value: "", label: "Любое" }, ...agencyIncludeOptions] },
    { type: "switch", name: "vacancies", label: "Есть вакансии", value: searchParams?.vacancies === "1" },
    { type: "switch", name: "verified", label: "Только проверенные", value: searchParams?.verified === "1" }
  ];

  const sortOptions = [
    { key: "rating", label: "По рейтингу" },
    { key: "share", label: "По доле (меньше→больше)" },
    { key: "new", label: "Новые профили" }
  ];
  const activeSort = sortOptions.some((o) => o.key === searchParams?.sort) ? searchParams!.sort! : "rating";

  return (
    <div>
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex rounded bg-sky px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white">Каталог</span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[26px]">Агентства для OnlyFans и Fansly: условия и доля</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Агентства, которые ведут аккаунты моделей под ключ — переписка, продвижение, контент-план. Фильтруйте по платформам и доле, сравнивайте до передачи доступа к аккаунту.
            </p>
          </div>
          <Link href="/cabinet/organization" className="btn btn-primary shrink-0">Добавить агентство</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{allProfiles.length}</b>агентств</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{avgShare != null ? `${avgShare}%` : "—"}</b>средняя доля</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{platforms.length}</b>платформ</div>
          <div><b className="block text-base font-bold tabular-nums text-zinc-900">{fullProfileCount}</b>с полным профилем</div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[250px_1fr]">
        <DirectoryFilterSidebar basePath="/agencies" groups={filterGroups} />

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600"><b className="text-zinc-900">{ranked.length}</b> {ranked.length === 1 ? "агентство найдено" : "агентств найдено"}</p>
            <div className="flex gap-1.5 text-xs">
              {sortOptions.map((option) => {
                const params = new URLSearchParams(currentParams);
                if (option.key === "rating") params.delete("sort");
                else params.set("sort", option.key);
                const href = `/agencies${params.toString() ? `?${params.toString()}` : ""}`;
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
              <h2 className="font-medium">Под выбранные фильтры агентств пока нет</h2>
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
