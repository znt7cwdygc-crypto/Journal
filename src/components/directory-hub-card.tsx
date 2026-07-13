import Link from "next/link";
import { saveDirectoryProfileAction } from "@/app/actions";
import { SafeImage } from "@/components/safe-image";
import { platformLabel, workFormatLabel } from "@/lib/directory-labels";
import { safeImageUrl } from "@/lib/media";
import { directoryProfileSeoPath } from "@/lib/seo-url";

type HubProfile = {
  id: string;
  type: "STUDIO" | "AGENCY";
  name: string;
  slug: string;
  city: string | null;
  summary: string;
  logoUrl: string | null;
  workFormats: string[];
  platforms: string[];
  percentMin: number | null;
  percentMax: number | null;
  agencySharePercent: number | null;
  verificationStatus: string;
  lastDataConfirmedAt: Date | null;
  vacancyCount?: number;
  usefulArticleCount?: number;
  savedBy?: { userId: string }[];
};

export function DirectoryHubCard({ profile, currentPath, isSaved }: { profile: HubProfile; currentPath: string; isSaved: boolean }) {
  const isStudio = profile.type === "STUDIO";
  const path = directoryProfileSeoPath(profile);
  const verified = profile.verificationStatus === "VERIFIED";
  const logo = safeImageUrl(profile.logoUrl);
  const money = isStudio
    ? profile.percentMin != null
      ? `${profile.percentMin}${profile.percentMax ? `-${profile.percentMax}` : ""}%`
      : null
    : profile.agencySharePercent != null
      ? `доля ${profile.agencySharePercent}%`
      : null;

  const traits = [
    ...profile.workFormats.map(workFormatLabel),
    ...profile.platforms.slice(0, 3).map(platformLabel)
  ].slice(0, 5);

  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-hot px-2.5 py-1 font-semibold text-white">{isStudio ? "Студия" : "Агентство"}</span>
        {verified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">проверена</span>}
        {profile.lastDataConfirmedAt && (
          <span className="text-zinc-500">Проверено: {profile.lastDataConfirmedAt.toLocaleDateString("ru-RU")}</span>
        )}
      </div>

      <Link href={path} className="block">
        <div className="mt-3 flex items-start gap-3">
          {logo ? (
            <SafeImage
              className="h-11 w-11 shrink-0 rounded object-cover"
              src={logo}
              alt={profile.name}
              fallback={
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-hot text-base font-black text-white">
                  {profile.name.slice(0, 1).toUpperCase()}
                </span>
              }
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-hot text-base font-black text-white">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold leading-tight text-ink">{profile.name}</h3>
            <p className="text-sm text-zinc-500">{profile.city || "Онлайн"}</p>
          </div>
        </div>
        {money && <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">{money}</p>}
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-700">{profile.summary}</p>
      </Link>

      {traits.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          {traits.map((trait) => (
            <span key={trait}>{trait}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        {(profile.usefulArticleCount ?? 0) > 0 && <span>Полезных статей: {profile.usefulArticleCount}</span>}
        {(profile.vacancyCount ?? 0) > 0 && <span>Активных вакансий: {profile.vacancyCount}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={path} className="btn btn-primary h-10 w-full text-center text-xs font-semibold">
          Открыть
        </Link>
        <form action={saveDirectoryProfileAction}>
          <input type="hidden" name="directoryProfileId" value={profile.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="h-10 w-full rounded-lg bg-zinc-100 px-1 text-xs font-semibold text-zinc-800" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
      </div>
    </article>
  );
}
