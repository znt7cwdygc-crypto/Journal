import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdBlock } from "@/components/ad-block";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { ResumeDirectoryCard } from "@/components/directory-card";
import { siteUrl } from "@/lib/seo";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Резюме специалистов вебкам-индустрии — MyCamDesk",
  description: "Публичные резюме моделей, операторов и специалистов вебкам-индустрии с указанием города, опыта и контактов. Найдите сотрудника на MyCamDesk.",
  alternates: { canonical: "/resumes" },
  openGraph: {
    title: "Резюме MyCamDesk",
    description: "Каталог публичных резюме участников сообщества.",
    url: "/resumes"
  }
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

function cleanFilter(value?: string) {
  return String(value ?? "").trim().slice(0, 120);
}

function normalizeSort(value?: string) {
  return sortOptions.some((option) => option.key === value) ? String(value) : "new";
}

function isRemoteResume(resume: { city: string | null }) {
  const city = (resume.city || "").toLowerCase();
  return city === "remote" || city.includes("удален");
}

export default async function ResumesPage({ searchParams }: { searchParams?: { sort?: string; city?: string; reported?: string; favorite?: string } }) {
  const session = await auth();
  const now = new Date();
  const sort = normalizeSort(searchParams?.sort);
  const cityValue = cleanFilter(searchParams?.city);
  const currentParams = new URLSearchParams();
  if (cityValue) currentParams.set("city", cityValue);
  if (sort !== "new") currentParams.set("sort", sort);
  const currentQuery = currentParams.toString();
  const currentPath = `/resumes${currentQuery ? `?${currentQuery}` : ""}`;

  const allResumes = await prisma.resume.findMany({
    where: {
      isPublic: true,
      hiddenByInactivity: false,
      expiresAt: { gt: now }
    },
    include: {
      user: true,
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { updatedAt: "desc" }
  });
  const hasRemote = allResumes.some(isRemoteResume);
  const cities = Array.from(
    new Set(
      allResumes
        .filter((resume) => !isRemoteResume(resume))
        .map((resume) => resume.city?.trim())
        .filter((city): city is string => Boolean(city))
    )
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const resumes = allResumes.filter((resume) => {
    const remote = isRemoteResume(resume);
    return !cityValue || (cityValue === "remote" ? remote : remote || resume.city?.trim() === cityValue);
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
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Резюме добавлено в избранное."
      : searchParams?.favorite === "removed"
        ? "Резюме убрано из избранного."
        : null;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Резюме",
        "description": "Публичные резюме моделей и специалистов MyCamDesk с городом, опытом и откликами.",
        "url": siteUrl("/resumes").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <CatalogPageHeader
        eyebrow="Работа"
        title="Резюме"
        description="Анкеты моделей и специалистов с опытом, городом, графиком и контактами."
        actionLabel="Разместить резюме"
        actionHref="/cabinet#resume"
      />
      <CatalogFilterForm
        basePath="/resumes"
        filters={[
          {
            name: "city",
            label: "Город",
            value: cityValue,
            options: [
              { value: "", label: "Все" },
              ...(hasRemote ? [{ value: "remote", label: "Удаленно" }] : []),
              ...cities.map((city) => ({ value: city, label: city }))
            ]
          },
          {
            name: "sort",
            label: "Сортировка",
            value: sort,
            defaultValue: "new",
            options: sortOptions.map((option) => ({ value: option.key, label: option.label }))
          }
        ]}
      />
      <AdBlock placement="resumes" />
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
      {resumes.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">{cityValue ? "Для выбранного фильтра резюме пока нет" : "Резюме пока нет"}</h2>
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
          {items.map((resume) => (
              <ResumeDirectoryCard key={resume.id} resume={resume} currentPath={currentPath} />
          ))}
        </section>
      ))}
    </div>
  );
}
