import type { Metadata } from "next";
import Link from "next/link";
import { saveMatchProfileAction } from "@/app/actions";
import { auth } from "@/auth";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Модель оператор",
  description: "Бесплатный раздел поиска связки модель-оператор на WebcamExpert.",
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

function isRemoteProfile(profile: { city: string | null; workFormat: string }) {
  const city = (profile.city || "").toLowerCase();
  return profile.workFormat === "REMOTE" || city === "remote" || city.includes("удален");
}

export default async function ModelOperatorPage({
  searchParams
}: {
  searchParams?: { role?: string; city?: string; format?: string; experience?: string; sort?: string; reported?: string; favorite?: string };
}) {
  const session = await auth();
  const now = new Date();
  const role = ["MODEL", "OPERATOR"].includes(cleanFilter(searchParams?.role)) ? cleanFilter(searchParams?.role) : "";
  const format = ["REMOTE", "OFFICE", "HYBRID"].includes(cleanFilter(searchParams?.format)) ? cleanFilter(searchParams?.format) : "";
  const city = cleanFilter(searchParams?.city);
  const experience = cleanFilter(searchParams?.experience);
  const sort = normalizeSort(searchParams?.sort);
  const currentParams = new URLSearchParams();
  if (role) currentParams.set("role", role);
  if (format) currentParams.set("format", format);
  if (city) currentParams.set("city", city);
  if (experience) currentParams.set("experience", experience);
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

  const hasRemote = allProfiles.some(isRemoteProfile);
  const cities = Array.from(
    new Set(
      allProfiles
        .filter((profile) => !isRemoteProfile(profile))
        .map((profile) => profile.city?.trim())
        .filter((item): item is string => Boolean(item))
    )
  ).sort((a, b) => a.localeCompare(b, "ru"));
  const experienceOptions = Array.from(new Set(allProfiles.map((profile) => profile.experience).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const profiles = allProfiles.filter((profile) => {
    const remote = isRemoteProfile(profile);
    return (
      (!role || profile.seekerRole === role) &&
      (!format || profile.workFormat === format) &&
      (!city || (city === "remote" ? remote : remote || profile.city?.trim() === city)) &&
      (!experience || profile.experience === experience)
    );
  });

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
            name: "role",
            label: "Кто",
            value: role,
            options: [
              { value: "", label: "Все" },
              { value: "MODEL", label: "Модели" },
              { value: "OPERATOR", label: "Операторы" }
            ]
          },
          {
            name: "city",
            label: "Город",
            value: city,
            options: [
              { value: "", label: "Все" },
              ...(hasRemote ? [{ value: "remote", label: "Удаленно" }] : []),
              ...cities.map((item) => ({ value: item, label: item }))
            ]
          },
          {
            name: "format",
            label: "Формат",
            value: format,
            options: [{ value: "", label: "Любой" }, ...Object.entries(formatLabels).map(([value, label]) => ({ value, label }))]
          },
          {
            name: "experience",
            label: "Опыт",
            value: experience,
            options: [{ value: "", label: "Любой" }, ...experienceOptions.map((item) => ({ value: item, label: item }))]
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

        return (
          <article key={profile.id} className="directory-card bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">{roleLabels[profile.seekerRole] || profile.seekerRole}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">Ищу: {roleLabels[profile.lookingFor] || profile.lookingFor}</span>
              <span className="text-zinc-500">до {profile.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</span>
            </div>

            <h2 className="mt-3 text-xl font-semibold leading-tight text-ink">{profile.title}</h2>
            {profile.operatorPercent && (
              <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">
                Оператору: {profile.operatorPercent}
              </p>
            )}
            <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{profile.bio}</p>

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
