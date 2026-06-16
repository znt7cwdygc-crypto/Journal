import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentSort } from "@/components/content-sort";
import { CityFilter } from "@/components/city-filter";
import { ListingDirectoryCard } from "@/components/directory-card";
import { serviceTopic } from "@/lib/topics";
import { CITY_OPTIONS, type CityValue } from "@/lib/city-constants";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Услуги",
  description: "Каталог услуг, экспертов и консультаций WebcamExpert для моделей, студий и команд.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Услуги WebcamExpert",
    description: "Эксперты, сервисы и консультации для участников индустрии.",
    url: "/services"
  }
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

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

export default async function ServicesPage({ searchParams }: { searchParams?: { sort?: string; city?: string; reported?: string } }) {
  const session = await auth();
  const sort = searchParams?.sort || "new";
  const cityValue = normalizeCity(searchParams?.city);
  const cityMeta = CITY_OPTIONS.find((city) => city.value === cityValue);
  const currentPath = `/services${cityValue ? `?city=${encodeURIComponent(cityValue)}` : ""}`;

  const services = await prisma.listing.findMany({
    where: {
      type: "SERVICE",
      status: "PUBLISHED",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ...(cityValue ? [cityWhere(cityValue)] : [])
      ]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { createdAt: "desc" },
    include: { createdBy: true }
  });

  if (services.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: services.map((s) => s.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof services>();
  for (const v of services) {
    const key = serviceTopic(v.title, v.description);
    grouped.set(key, [...(grouped.get(key) || []), v]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Услуги{cityMeta ? ` • ${cityMeta.label}` : ""}</h1>
      <CityFilter basePath="/services" active={cityValue} sort={sort} />
      <ContentSort basePath="/services" active={sort} options={sortOptions} params={{ city: cityValue || undefined }} />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {services.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">{cityMeta ? `Для города ${cityMeta.label} услуг пока нет` : "Услуг пока нет"}</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другой город в фильтре или вернитесь позже, когда появятся новые эксперты.</p>
        </section>
      )}
      {Array.from(grouped.entries()).map(([section, items]) => (
        <section key={section} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">{section}</h2>
          {items.map((v) => (
            <ListingDirectoryCard key={v.id} listing={v} kind="SERVICE" topic={section} currentPath={currentPath} isSignedIn={Boolean(session?.user)} />
          ))}
        </section>
      ))}
    </div>
  );
}
