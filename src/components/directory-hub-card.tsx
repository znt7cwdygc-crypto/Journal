import Link from "next/link";
import { saveDirectoryProfileAction } from "@/app/actions";
import { SafeImage } from "@/components/safe-image";
import { platformLabel } from "@/lib/directory-labels";
import { safeImageUrl } from "@/lib/media";
import { directoryProfileSeoPath } from "@/lib/seo-url";

type HubProfile = {
  id: string;
  type: "STUDIO" | "AGENCY";
  name: string;
  slug: string;
  city: string | null;
  workFormats: string[];
  summary: string;
  logoUrl: string | null;
  platforms: string[];
  percentMin: number | null;
  percentMax: number | null;
  roomsCount: number | null;
  foundedYear: number | null;
  hasTrainer: boolean;
  hasAccommodation: boolean;
  agencySharePercent: number | null;
  modelsCount: number | null;
  agencyIncludes: string[];
  verificationStatus: string;
  profileCompleteness: number;
  vacancyCount?: number;
  savedBy?: { userId: string }[];
};

const avatarColors = ["#ff4d2e", "#a855f7", "#f59e0b", "#0f766e", "#38bdf8"];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}

export function DirectoryHubCard({ profile, currentPath, isSaved }: { profile: HubProfile; currentPath: string; isSaved: boolean }) {
  const isStudio = profile.type === "STUDIO";
  const path = directoryProfileSeoPath(profile);
  const verified = profile.verificationStatus === "VERIFIED";
  const complete = profile.profileCompleteness >= 70;
  const logo = safeImageUrl(profile.logoUrl);
  const yearsActive = profile.foundedYear ? new Date().getFullYear() - profile.foundedYear : null;

  const facts = isStudio
    ? [
        { k: "Процент", v: profile.percentMin != null ? `${profile.percentMin}${profile.percentMax ? `-${profile.percentMax}` : ""}%` : "—" },
        { k: "Комнат", v: profile.roomsCount != null ? String(profile.roomsCount) : "—" },
        { k: yearsActive != null ? `С ${profile.foundedYear}` : "—", v: yearsActive != null ? `${yearsActive} ${yearsActive === 1 ? "год" : yearsActive < 5 ? "года" : "лет"}` : "—" }
      ]
    : [
        { k: "Доля", v: profile.agencySharePercent != null ? `${profile.agencySharePercent}%` : "—" },
        { k: "Моделей", v: profile.modelsCount != null ? String(profile.modelsCount) : "—" },
        { k: yearsActive != null ? `С ${profile.foundedYear}` : "—", v: yearsActive != null ? `${yearsActive} ${yearsActive === 1 ? "год" : yearsActive < 5 ? "года" : "лет"}` : "—" }
      ];

  const goodTags = isStudio
    ? [profile.hasTrainer ? "Тренер есть" : null, profile.hasAccommodation ? "С проживанием" : null].filter((v): v is string => Boolean(v))
    : profile.agencyIncludes.includes("PAYOUT_PAXUM")
      ? ["Paxum официально"]
      : [];
  const plainTags = profile.platforms.slice(0, 3).map(platformLabel);

  return (
    <article className={`rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-hot ${!complete ? "opacity-60" : ""}`}>
      <Link href={path} className="block">
        <div className="flex items-start gap-3">
          {logo ? (
            <SafeImage
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
              src={logo}
              alt={profile.name}
              fallback={
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white" style={{ background: complete ? avatarColor(profile.id) : "#a1a1aa" }}>
                  {profile.name.slice(0, 1).toUpperCase()}
                </span>
              }
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white" style={{ background: complete ? avatarColor(profile.id) : "#a1a1aa" }}>
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold leading-tight text-zinc-900">
              {profile.name}
              {verified && <span className="ml-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-accent">✓ проверено</span>}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {profile.city || "Онлайн"} · {profile.workFormats.length > 0 ? profile.workFormats.map((f) => (f === "OFFLINE" ? "офлайн" : f === "ONLINE" ? "онлайн" : "гибрид")).join(" + ") : "формат не указан"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200">
          {facts.map((fact, i) => (
            <div key={i} className="bg-zinc-50 px-2.5 py-2">
              <div className="truncate text-[9.5px] uppercase tracking-wide text-zinc-400">{fact.k}</div>
              <div className="mt-0.5 text-[13px] font-bold tabular-nums text-zinc-900">{fact.v}</div>
            </div>
          ))}
        </div>

        {complete ? (
          (goodTags.length > 0 || plainTags.length > 0) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {goodTags.map((tag) => (
                <span key={tag} className="rounded-full bg-teal-50 px-2 py-1 text-[10.5px] font-semibold text-accent">{tag}</span>
              ))}
              {plainTags.map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-100 px-2 py-1 text-[10.5px] font-semibold text-zinc-600">{tag}</span>
              ))}
            </div>
          )
        ) : (
          <div className="mt-2.5">
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10.5px] font-semibold text-zinc-500">Профиль не заполнен полностью</span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{complete ? "Полный профиль" : "Базовая карточка"}</span>
          <span>Открыто вакансий: {profile.vacancyCount ?? 0}</span>
        </div>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={path} className="btn btn-primary h-9 w-full text-center text-xs font-semibold">
          Открыть
        </Link>
        <form action={saveDirectoryProfileAction}>
          <input type="hidden" name="directoryProfileId" value={profile.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="h-9 w-full rounded-lg bg-zinc-100 px-1 text-xs font-semibold text-zinc-800" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
      </div>
    </article>
  );
}
