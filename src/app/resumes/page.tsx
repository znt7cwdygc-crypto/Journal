import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContentSort } from "@/components/content-sort";
import { CityFilter } from "@/components/city-filter";
import { ResumeDirectoryCard } from "@/components/directory-card";
import { CITY_OPTIONS, type CityValue } from "@/lib/city-constants";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Резюме",
  description: "Публичные резюме моделей и специалистов WebcamExpert с городом, опытом и откликами.",
  alternates: { canonical: "/resumes" },
  openGraph: {
    title: "Резюме WebcamExpert",
    description: "Каталог публичных резюме участников сообщества.",
    url: "/resumes"
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
    { city: { contains: "удален", mode: "insensitive" as const } }
  ];

  if (cityMeta.value === "remote") return { OR: remote };

  return {
    OR: [
      { city: { equals: cityMeta.label, mode: "insensitive" as const } },
      { city: { equals: cityMeta.value, mode: "insensitive" as const } },
      ...remote
    ]
  };
}

export default async function ResumesPage({ searchParams }: { searchParams?: { sort?: string; city?: string } }) {
  const session = await auth();
  const now = new Date();
  const inactivityCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);
  const sort = searchParams?.sort || "new";
  const cityValue = normalizeCity(searchParams?.city);
  const cityMeta = CITY_OPTIONS.find((city) => city.value === cityValue);

  const resumes = await prisma.resume.findMany({
    where: {
      isPublic: true,
      hiddenByInactivity: false,
      lastVisitedAt: { gte: inactivityCutoff },
      ...(cityValue ? cityWhere(cityValue) : {})
    },
    include: { user: true },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { updatedAt: "desc" }
  });

  if (resumes.length > 0) {
    await prisma.resume.updateMany({ where: { id: { in: resumes.map((r) => r.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const userId = session?.user?.id;
  const role = session?.user?.role;

  const grouped = new Map<string, typeof resumes>();
  for (const resume of resumes) {
    const key = resume.roleGoal || "Без цели";
    grouped.set(key, [...(grouped.get(key) || []), resume]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Резюме{cityMeta ? ` • ${cityMeta.label}` : ""}</h1>
      <CityFilter basePath="/resumes" active={cityValue} sort={sort} />
      <ContentSort basePath="/resumes" active={sort} options={sortOptions} params={{ city: cityValue || undefined }} />
      {resumes.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">{cityMeta ? `Для города ${cityMeta.label} резюме пока нет` : "Резюме пока нет"}</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно сменить город или разместить собственное резюме из кабинета.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg bg-hot px-3 py-2 font-medium text-white" href="/cabinet">
              Разместить резюме
            </Link>
          </div>
        </section>
      )}
      {Array.from(grouped.entries()).map(([section, items]) => (
        <section key={section} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">{section}</h2>
          {items.map((resume) => {
            const isOwner = resume.userId === userId;
            const isAdmin = role === "ADMIN";
            const canSeeContacts = Boolean(session?.user) || isOwner || isAdmin;
            return (
              <ResumeDirectoryCard key={resume.id} resume={resume} canSeeContacts={canSeeContacts} />
            );
          })}
        </section>
      ))}
    </div>
  );
}
