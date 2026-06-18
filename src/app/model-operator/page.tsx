import type { Metadata } from "next";
import Link from "next/link";
import { respondToMatchProfileAction } from "@/app/actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskContact } from "@/lib/validation";

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

const roles = [
  ["", "Все"],
  ["MODEL", "Модели"],
  ["OPERATOR", "Операторы"]
] as const;

const formats = [
  ["", "Любой формат"],
  ["REMOTE", "Удаленно"],
  ["OFFICE", "В студии"],
  ["HYBRID", "Гибрид"]
] as const;

function cleanFilter(value?: string) {
  return (value || "").trim().slice(0, 80);
}

function filterHref(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/model-operator${suffix ? `?${suffix}` : ""}`;
}

export default async function ModelOperatorPage({
  searchParams
}: {
  searchParams?: { role?: string; city?: string; format?: string; experience?: string };
}) {
  const session = await auth();
  const now = new Date();
  const role = ["MODEL", "OPERATOR"].includes(cleanFilter(searchParams?.role)) ? cleanFilter(searchParams?.role) : "";
  const format = ["REMOTE", "OFFICE", "HYBRID"].includes(cleanFilter(searchParams?.format)) ? cleanFilter(searchParams?.format) : "";
  const city = cleanFilter(searchParams?.city);
  const experience = cleanFilter(searchParams?.experience);

  const profiles = await prisma.matchProfile.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(role ? { seekerRole: role } : {}),
      ...(format ? { workFormat: format } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(experience ? { experience } : {})
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" }
  });

  if (profiles.length > 0) {
    await prisma.matchProfile.updateMany({ where: { id: { in: profiles.map((profile) => profile.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const experienceOptions = Array.from(new Set(profiles.map((profile) => profile.experience))).filter(Boolean);

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
        <p className="eyebrow">Связки</p>
        <h1 className="page-title mt-1">Модель оператор</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Бесплатные анкеты на 14 дней: модели ищут операторов, операторы ищут моделей или обе стороны открыты к связке.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/cabinet#match">Разместить анкету</Link>
        </div>
      </section>

      <section className="rounded-lg bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {roles.map(([value, label]) => (
            <Link key={value || "all"} className={`rounded-full px-3 py-1.5 ${role === value ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`} href={filterHref({ role: value, city, format, experience })}>
              {label}
            </Link>
          ))}
          {formats.map(([value, label]) => (
            <Link key={value || "format-all"} className={`rounded-full px-3 py-1.5 ${format === value ? "bg-hot text-white" : "bg-zinc-100 text-zinc-700"}`} href={filterHref({ role, city, format: value, experience })}>
              {label}
            </Link>
          ))}
        </div>
        <form className="mt-3 grid gap-2 sm:grid-cols-3" action="/model-operator">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="format" value={format} />
          <input className="form-field" name="city" defaultValue={city} placeholder="Город или удаленно" />
          <select className="form-field" name="experience" defaultValue={experience}>
            <option value="">Любой опыт</option>
            {experienceOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="btn btn-secondary" type="submit">Применить</button>
        </form>
      </section>

      {profiles.length === 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Анкет пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно первым разместить анкету модели или оператора в кабинете.</p>
        </section>
      )}

      {profiles.map((profile) => {
        const authorName = profile.user.name || profile.user.email || "Профиль";
        const canSeeContact = Boolean(session?.user);

        return (
          <article key={profile.id} className="directory-card bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">{roleLabels[profile.seekerRole] || profile.seekerRole}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">Ищу: {roleLabels[profile.lookingFor] || profile.lookingFor}</span>
              <span className="text-zinc-500">до {profile.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</span>
            </div>

            <h2 className="mt-3 text-xl font-semibold leading-tight text-ink">{profile.title}</h2>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{profile.bio}</p>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>{profile.city || "Город не указан"}</span>
              <span>{formatLabels[profile.workFormat] || profile.workFormat}</span>
              <span>{profile.timezone || "Часовой пояс не указан"}</span>
              <span>Опыт: {profile.experience}</span>
              <span>График: {profile.schedule}</span>
              {profile.operatorPercent && <span>Оператору: {profile.operatorPercent}</span>}
              {profile.currentCheck && <span>Чек: {profile.currentCheck}</span>}
              {profile.niche && <span>Ниша: {profile.niche}</span>}
              <span>Просмотры: {profile.viewCount + 1}</span>
              <span>Отклики: {profile.responseCount}</span>
            </div>

            <div className="mt-3 text-sm text-zinc-700">
              <span className="font-medium text-zinc-900">Контакт: </span>
              {canSeeContact ? profile.contact : maskContact(profile.contact)}
              {!canSeeContact && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью.</p>}
            </div>

            <div className="directory-actions mt-4 flex flex-wrap gap-2">
              <form action={respondToMatchProfileAction}>
                <input type="hidden" name="matchProfileId" value={profile.id} />
                <button className="btn btn-primary w-full" type="submit">Откликнуться</button>
              </form>
              <Link className="btn btn-ghost" href={`/profiles/${profile.userId}`}>Профиль</Link>
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
