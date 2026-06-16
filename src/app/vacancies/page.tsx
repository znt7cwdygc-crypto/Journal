import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentSort } from "@/components/content-sort";
import { CityFilter } from "@/components/city-filter";
import { ListingDirectoryCard } from "@/components/directory-card";
import { CITY_OPTIONS, type CityValue } from "@/lib/city-constants";
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

function normalizeCity(value?: string): CityValue | "" {
  return CITY_OPTIONS.some((city) => city.value === value) ? (value as CityValue) : "";
}

function cityWhere(cityValue: CityValue | "") {
  const cityMeta = CITY_OPTIONS.find((city) => city.value === cityValue);
  if (!cityMeta) return {};

  const remote = [
    { city: { equals: "Удаленно", mode: "insensitive" as const } },
    { city: { equals: "remote", mode: "insensitive" as const } },
    { city: { contains: "удален", mode: "insensitive" as const } },
    { geoCode: { equals: "remote", mode: "insensitive" as const } },
    { employmentType: "REMOTE" as const }
  ];

  if (cityMeta.value === "remote") return { OR: remote };

  return {
    OR: [
      { city: { equals: cityMeta.label, mode: "insensitive" as const } },
      { geoCode: { equals: cityMeta.geoCode, mode: "insensitive" as const } },
      ...remote
    ]
  };
}

export default async function VacanciesPage({ searchParams }: { searchParams?: { sort?: string; city?: string; reported?: string } }) {
  const session = await auth();
  const sort = searchParams?.sort || "new";
  const cityValue = normalizeCity(searchParams?.city);
  const cityMeta = CITY_OPTIONS.find((city) => city.value === cityValue);
  const currentPath = `/vacancies${cityValue ? `?city=${encodeURIComponent(cityValue)}` : ""}`;

  const vacancies = await prisma.listing.findMany({
    where: {
      type: "VACANCY",
      status: "PUBLISHED",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ...(cityValue ? [cityWhere(cityValue)] : [])
      ]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { createdAt: "desc" },
    include: { createdBy: true }
  });

  if (vacancies.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: vacancies.map((v) => v.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof vacancies>();
  for (const v of vacancies) {
    const key = v.employmentType || "UNKNOWN";
    grouped.set(key, [...(grouped.get(key) || []), v]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Вакансии{cityMeta ? ` • ${cityMeta.label}` : ""}</h1>
      <CityFilter basePath="/vacancies" active={cityValue} sort={sort} />
      <ContentSort basePath="/vacancies" active={sort} options={sortOptions} params={{ city: cityValue || undefined }} />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {vacancies.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">{cityMeta ? `Для города ${cityMeta.label} вакансий пока нет` : "Вакансий пока нет"}</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другой город в фильтре или вернитесь позже.</p>
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
