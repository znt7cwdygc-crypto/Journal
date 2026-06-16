import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentSort } from "@/components/content-sort";
import { ListingDirectoryCard } from "@/components/directory-card";
import { getSelectedCity, getCityMeta } from "@/lib/city";
import Link from "next/link";
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

export default async function VacanciesPage({ searchParams }: { searchParams?: { sort?: string; reported?: string } }) {
  const session = await auth();
  const sort = searchParams?.sort || "new";
  const currentPath = sort === "new" ? "/vacancies" : `/vacancies?sort=${encodeURIComponent(sort)}`;
  const selectedCity = getSelectedCity();
  const cityMeta = getCityMeta(selectedCity);
  if (!cityMeta) return null;

  const vacancies = await prisma.listing.findMany({
    where: {
      type: "VACANCY",
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      AND: [
        {
          OR: [
            { city: { equals: cityMeta.label, mode: "insensitive" } },
            { geoCode: { equals: cityMeta.geoCode, mode: "insensitive" } }
          ]
        }
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
      <h1 className="text-2xl font-semibold">Вакансии • {cityMeta.label}</h1>
      <ContentSort basePath="/vacancies" active={sort} options={sortOptions} />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {vacancies.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Для города {cityMeta.label} вакансий пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно выбрать другой город или посмотреть удаленные предложения.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg bg-hot px-3 py-2 font-medium text-white" href="/select-city?next=/vacancies">
              Выбрать город
            </Link>
            <Link className="rounded-lg border border-zinc-200 px-3 py-2 font-medium text-zinc-700" href="/select-city?next=/vacancies">
              Сменить на удаленно
            </Link>
          </div>
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
