import type { Metadata } from "next";
import Link from "next/link";
import { saveMatchProfileAction } from "@/app/actions";
import { auth } from "@/auth";
import { AdBlock } from "@/components/ad-block";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { matchProfileSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Модель оператор",
  description: "Бесплатный раздел поиска связки модель-оператор на MyCamDesk.",
  alternates: { canonical: "/model-operator" },
  openGraph: {
    title: "Модель оператор",
    description: "Анкеты моделей и операторов, которые ищут рабочую связку.",
    url: "/model-operator"
  }
};

const roleLabels: Record<string, string> = {
  MODEL: "Модель",
  OPERATOR: "Оператор",
  BOTH: "Любой вариант"
};

const formatLabels: Record<string, string> = {
  REMOTE: "Удаленно",
  OFFICE: "В студии",
  HYBRID: "Гибрид"
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

function cleanFilter(value?: string) {
  return (value || "").trim().slice(0, 80);
}

function normalizeSort(value?: string) {
  return sortOptions.some((option) => option.key === value) ? String(value) : "new";
}

export default async function ModelOperatorPage({
  searchParams
}: {
  searchParams?: { lookingFor?: string; sort?: string; reported?: string; favorite?: string };
}) {
  const session = await auth();
  const now = new Date();
  const lookingFor = ["MODEL", "OPERATOR"].includes(cleanFilter(searchParams?.lookingFor)) ? cleanFilter(searchParams?.lookingFor) : "";
  const sort = normalizeSort(searchParams?.sort);
  const currentParams = new URLSearchParams();
  if (lookingFor) currentParams.set("lookingFor", lookingFor);
  if (sort !== "new") currentParams.set("sort", sort);
  const currentQuery = currentParams.toString();
  const currentPath = `/model-operator${currentQuery ? `?${currentQuery}` : ""}`;

  const allProfiles = await prisma.matchProfile.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    include: {
      user: true,
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { updatedAt: "desc" }
  });

  const profiles = allProfiles.filter((profile) => !lookingFor || profile.lookingFor === lookingFor);

  if (profiles.length > 0) {
    await prisma.matchProfile.updateMany({ where: { id: { in: profiles.map((profile) => profile.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Анкета добавлена в избранное."
      : searchParams?.favorite === "removed"
        ? "Анкета убрана из избранного."
        : null;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Модель оператор",
        "url": siteUrl("/model-operator").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl("/").toString() },
          { "@type": "ListItem", "position": 2, "name": "Модель оператор" }
        ]
      }) }} />
      <CatalogPageHeader
        eyebrow="Связки"
        title="Модель оператор"
        description="Бесплатные анкеты на 14 дней: модели ищут операторов, операторы ищут моделей или обе стороны открыты к связке."
        actionLabel="Разместить анкету"
        actionHref="/cabinet#match"
      />

      <CatalogFilterForm
        basePath="/model-operator"
        filters={[
          {
            name: "lookingFor",
            label: "Ищу",
            value: lookingFor,
            options: [
              { value: "", label: "Все" },
              { value: "MODEL", label: "Модель" },
              { value: "OPERATOR", label: "Оператор" }
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
      <AdBlock placement="model-operator" />

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

      {profiles.length === 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Анкет пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно первым разместить анкету модели или оператора в кабинете.</p>
        </section>
      )}

      {profiles.map((profile) => {
        const authorName = profile.user.name || profile.user.email || "Профиль";
        const isSaved = Boolean(profile.savedBy?.length);
        const profilePath = matchProfileSeoPath(profile);

        return (
          <article key={profile.id} className="directory-card bg-white p-4 shadow-sm sm:p-5">
            <Link href={profilePath} className="block">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">{roleLabels[profile.seekerRole] || profile.seekerRole}</span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">Ищу: {roleLabels[profile.lookingFor] || profile.lookingFor}</span>
                <span className="text-zinc-500">до {profile.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</span>
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-tight text-ink">{profile.title}</h2>
              {profile.operatorPercent && (
                <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">
                  Оплата: {profile.operatorPercent}
                </p>
              )}
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{profile.bio}</p>
            </Link>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>{profile.city || "Город не указан"}</span>
              <span>{formatLabels[profile.workFormat] || profile.workFormat}</span>
              <span>{profile.timezone || "Часовой пояс не указан"}</span>
              <span>Опыт: {profile.experience}</span>
              <span>График: {profile.schedule}</span>
              {profile.currentCheck && <span>Чек: {profile.currentCheck}</span>}
              {profile.niche && <span>Ниша: {profile.niche}</span>}
              <span>Просмотры: {profile.viewCount + 1}</span>
              <span>Отклики: {profile.responseCount}</span>
            </div>

            <div className="directory-actions mt-4 grid grid-cols-3 gap-2">
              <ContactReveal contact={profile.contact} signedIn={Boolean(session?.user)} compact />
              <form action={saveMatchProfileAction}>
                <input type="hidden" name="matchProfileId" value={profile.id} />
                <input type="hidden" name="next" value={currentPath} />
                <button className="btn btn-muted h-10 w-full whitespace-nowrap px-1 text-[11px]" type="submit">
                  {isSaved ? "Убрать" : "В избранное"}
                </button>
              </form>
              <ReportButton
                targetType="MATCH_PROFILE"
                targetId={profile.id}
                next={currentPath}
                buttonClassName="btn btn-danger h-10 w-full whitespace-nowrap px-1 text-[11px]"
              />
            </div>

            <Link href={`/profiles/${profile.userId}`} className="mt-4 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 hover:text-hot">
              {profile.user.image ? (
                <img className="h-8 w-8 shrink-0 rounded object-cover" src={profile.user.image} alt={authorName} />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-hot font-black text-white">
                  {authorName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-800">{authorName}</span>
                {profile.user.profileBio && <span className="block truncate text-zinc-500">{profile.user.profileBio}</span>}
              </span>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
