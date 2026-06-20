import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ListingDirectoryCard } from "@/components/directory-card";
import { VacancyFilterForm } from "@/components/vacancy-filter-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вакансии",
  description: "Актуальные вакансии студий и команд WebcamExpert с фильтрацией по городу и формату работы.",
  alternates: { canonical: "/vacancies" },
  openGraph: {
    title: "Вакансии WebcamExpert",
    description: "Каталог вакансий для моделей, операторов и специалистов индустрии.",
    url: "/vacancies"
  }
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

const groups: Record<string, string> = {
  REMOTE: "Удаленно",
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  UNKNOWN: "Без формата"
};

function cleanFilter(value?: string) {
  return String(value ?? "").trim().slice(0, 120);
}

function normalizeSort(value?: string) {
  return sortOptions.some((option) => option.key === value) ? String(value) : "new";
}

function isRemoteListing(listing: { city: string | null; geoCode: string | null; employmentType: string | null }) {
  const city = (listing.city || "").toLowerCase();
  return listing.employmentType === "REMOTE" || listing.geoCode?.toLowerCase() === "remote" || city === "remote" || city.includes("удален");
}

export default async function VacanciesPage({ searchParams }: { searchParams?: { sort?: string; city?: string; reported?: string; favorite?: string } }) {
  const session = await auth();
  const sort = normalizeSort(searchParams?.sort);
  const cityValue = cleanFilter(searchParams?.city);
  const currentParams = new URLSearchParams();
  if (cityValue) currentParams.set("city", cityValue);
  if (sort !== "new") currentParams.set("sort", sort);
  const currentQuery = currentParams.toString();
  const currentPath = `/vacancies${currentQuery ? `?${currentQuery}` : ""}`;

  const allVacancies = await prisma.listing.findMany({
    where: {
      type: "VACANCY",
      status: "PUBLISHED",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { createdAt: "desc" },
    include: {
      createdBy: true,
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    }
  });

  const hasRemote = allVacancies.some(isRemoteListing);
  const cities = Array.from(
    new Set(
      allVacancies
        .filter((vacancy) => !isRemoteListing(vacancy))
        .map((vacancy) => vacancy.city?.trim())
        .filter((city): city is string => Boolean(city))
    )
  ).sort((a, b) => a.localeCompare(b, "ru"));

  const vacancies = allVacancies.filter((vacancy) => {
    const remote = isRemoteListing(vacancy);
    return !cityValue || (cityValue === "remote" ? remote : remote || vacancy.city?.trim() === cityValue);
  });

  if (vacancies.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: vacancies.map((v) => v.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof vacancies>();
  for (const v of vacancies) {
    const key = v.employmentType || "UNKNOWN";
    grouped.set(key, [...(grouped.get(key) || []), v]);
  }
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Вакансия добавлена в избранное."
      : searchParams?.favorite === "removed"
        ? "Вакансия убрана из избранного."
        : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Вакансии</h1>
      <VacancyFilterForm cityValue={cityValue} sortValue={sort} hasRemote={hasRemote} cities={cities} sortOptions={sortOptions} />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {favoriteMessage && (
        <section className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {favoriteMessage}
        </section>
      )}
      {vacancies.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Под выбранные фильтры вакансий пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другой город или сортировку, когда появятся новые предложения.</p>
        </section>
      )}
      {Array.from(grouped.entries()).map(([key, items]) => (
        <section key={key} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">{groups[key] || key}</h2>
          {items.map((v) => (
            <ListingDirectoryCard key={v.id} listing={v} kind="VACANCY" topic={groups[key] || key} currentPath={currentPath} isSignedIn={Boolean(session?.user)} />
          ))}
        </section>
      ))}
    </div>
  );
}
