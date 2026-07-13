import Link from "next/link";
import { saveDirectoryProfileAction } from "@/app/actions";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
import { SafeImage } from "@/components/safe-image";
import {
  agencyIncludeLabel,
  audienceLabel,
  parseJson,
  platformLabel,
  workFormatLabel,
  type Penalty,
  type TeamComposition
} from "@/lib/directory-labels";
import type { DirectoryProfileWithRelations } from "@/lib/directory-queries";
import { safeImageUrl } from "@/lib/media";
import { articleSeoPath, directoryProfileSeoPath, listingSeoPath } from "@/lib/seo-url";

const numberFormat = new Intl.NumberFormat("ru-RU");

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0">
      <span className="min-w-[160px] shrink-0 text-zinc-500">{label}</span>
      <span className="whitespace-pre-wrap font-medium text-zinc-800">{value}</span>
    </div>
  );
}

function quickAnswer(profile: DirectoryProfileWithRelations) {
  const isStudio = profile.type === "STUDIO";
  const place = profile.city || "работает онлайн";
  const money = isStudio
    ? profile.percentMin != null
      ? `модель получает ${profile.percentMin}${profile.percentMax ? `-${profile.percentMax}` : ""}%`
      : null
    : profile.agencySharePercent != null
      ? `доля агентства ${profile.agencySharePercent}%`
      : null;

  return [
    `${profile.name} — ${isStudio ? "вебкам-студия" : "агентство контент-платформ"}, ${place}.`,
    money ? `${money[0].toUpperCase()}${money.slice(1)}.` : null,
    profile.verificationStatus === "VERIFIED" ? "Контакты и деятельность проверены редакцией." : null
  ]
    .filter(Boolean)
    .join(" ");
}

function buildFaq(profile: DirectoryProfileWithRelations) {
  const isStudio = profile.type === "STUDIO";
  const items: { question: string; answer: string }[] = [];

  if (isStudio && profile.percentMin != null) {
    items.push({
      question: `Какой процент у студии «${profile.name}»?`,
      answer: profile.percentMax
        ? `Модель получает от ${profile.percentMin}% до ${profile.percentMax}% в зависимости от условий.`
        : `Модель получает ${profile.percentMin}%.`
    });
  }
  if (!isStudio && profile.agencySharePercent != null) {
    items.push({
      question: `Какая доля у агентства «${profile.name}»?`,
      answer: `Агентство берёт ${profile.agencySharePercent}% от дохода модели.`
    });
  }
  if (isStudio && profile.payoutSchedule) {
    items.push({ question: "Как часто выплаты?", answer: profile.payoutSchedule });
  }
  items.push({
    question: `Как связаться с «${profile.name}»?`,
    answer: "Контакт для отклика открывается после входа в аккаунт на MyCamDesk."
  });
  items.push({
    question: `Проверена ли организация «${profile.name}»?`,
    answer:
      profile.verificationStatus === "VERIFIED"
        ? "Да, редакция MyCamDesk подтвердила контакты и факт деятельности. Это не гарантия условий или безопасности."
        : "Профиль пока не прошёл проверку редакции MyCamDesk."
  });

  return items;
}

export function DirectoryProfileView({ profile, signedIn }: { profile: DirectoryProfileWithRelations; signedIn: boolean }) {
  const isStudio = profile.type === "STUDIO";
  const path = directoryProfileSeoPath(profile);
  const team = isStudio ? parseJson<TeamComposition>(profile.teamComposition, {}) : {};
  const penalties = isStudio ? parseJson<Penalty[]>(profile.penalties, []) : [];
  const logo = safeImageUrl(profile.logoUrl);
  const verified = profile.verificationStatus === "VERIFIED";
  const faq = buildFaq(profile);

  return (
    <article className="space-y-4">
      <nav className="flex flex-wrap gap-1 text-xs text-zinc-500">
        <Link href="/" className="hover:text-hot">Главная</Link>
        <span>/</span>
        <Link href={isStudio ? "/studios" : "/agencies"} className="hover:text-hot">{isStudio ? "Студии" : "Агентства"}</Link>
        <span>/</span>
        <span className="text-zinc-700">{profile.name}</span>
      </nav>

      <section className="bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-hot px-3 py-1 font-semibold text-white">{isStudio ? "Студия" : "Агентство"}</span>
          {verified && <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">проверенная организация</span>}
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{profile.city || "Онлайн"}</span>
        </div>

        <div className="mt-4 flex items-start gap-4">
          {logo ? (
            <SafeImage
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
              src={logo}
              alt={profile.name}
              fallback={
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-hot text-2xl font-black text-white">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
              }
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-hot text-2xl font-black text-white">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{profile.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">{profile.summary}</p>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">{quickAnswer(profile)}</p>

        {profile.lastDataConfirmedAt && (
          <p className="mt-3 text-xs text-zinc-500">
            Данные подтверждены: {profile.lastDataConfirmedAt.toLocaleDateString("ru-RU")}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {profile.contactLink && (
            <ContactReveal contact={profile.contactLink} signedIn={signedIn} compact targetType="DIRECTORY_PROFILE" targetId={profile.id} />
          )}
          <form action={saveDirectoryProfileAction}>
            <input type="hidden" name="directoryProfileId" value={profile.id} />
            <input type="hidden" name="next" value={path} />
            <button className="h-10 w-full rounded-lg bg-zinc-100 px-1 text-[11px] font-semibold text-zinc-800" type="submit">
              В избранное
            </button>
          </form>
          <ReportButton
            targetType="DIRECTORY_PROFILE"
            targetId={profile.id}
            next={path}
            buttonClassName="h-10 w-full rounded-lg bg-red-50 px-1 text-[11px] font-semibold text-red-700"
          />
        </div>
      </section>

      <section className="bg-white p-6 shadow-sm">
        <h2 className="font-medium">{isStudio ? "Условия работы" : "Условия сотрудничества"}</h2>
        <div className="mt-2">
          {profile.workFormats.length > 0 && (
            <Fact label="Формат работы" value={profile.workFormats.map(workFormatLabel).join(", ")} />
          )}
          {profile.platforms.length > 0 && <Fact label="Платформы" value={profile.platforms.map(platformLabel).join(", ")} />}
          {isStudio && profile.audiences.length > 0 && (
            <Fact label="Кого набирают" value={profile.audiences.map(audienceLabel).join(", ")} />
          )}
          {isStudio && profile.percentMin != null && (
            <Fact
              label="Процент модели"
              value={profile.percentMax ? `${profile.percentMin}-${profile.percentMax}%` : `${profile.percentMin}%`}
            />
          )}
          {isStudio && profile.payoutSchedule && <Fact label="График выплат" value={profile.payoutSchedule} />}
          {!isStudio && profile.agencySharePercent != null && <Fact label="Доля агентства" value={`${profile.agencySharePercent}%`} />}
          {!isStudio && profile.modelsCount != null && <Fact label="Моделей в работе" value={numberFormat.format(profile.modelsCount)} />}
          {!isStudio && profile.agencyIncludes.length > 0 && (
            <Fact label="Что входит" value={profile.agencyIncludes.map(agencyIncludeLabel).join(", ")} />
          )}
          {profile.foundedYear && <Fact label="Год основания" value={String(profile.foundedYear)} />}
        </div>

        {isStudio && penalties.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-zinc-800">Штрафы и удержания</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {penalties.map((penalty, index) => (
                <li key={index}>{penalty.label}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {isStudio && (profile.roomsCount != null || profile.equipment || profile.livingConditions || profile.district || profile.landmark) && (
        <section className="bg-white p-6 shadow-sm">
          <h2 className="font-medium">Комнаты и быт</h2>
          <div className="mt-2">
            {profile.district && <Fact label="Район" value={profile.district} />}
            {profile.landmark && <Fact label="Ориентир" value={profile.landmark} />}
            {profile.addressIsPublic && profile.privateAddress && <Fact label="Адрес" value={profile.privateAddress} />}
            {profile.roomsCount != null && <Fact label="Комнат" value={String(profile.roomsCount)} />}
            {profile.hasAccommodation && <Fact label="Проживание" value="Есть общежитие / проживание" />}
            {profile.equipment && <Fact label="Оборудование" value={profile.equipment} />}
            {profile.livingConditions && <Fact label="Бытовые условия" value={profile.livingConditions} />}
          </div>
        </section>
      )}

      {isStudio && (team.admins || team.operators || team.femaleCount || team.maleCount || team.hasTrainer) && (
        <section className="bg-white p-6 shadow-sm">
          <h2 className="font-medium">Команда</h2>
          <div className="mt-2">
            {team.admins != null && <Fact label="Администраторы" value={String(team.admins)} />}
            {team.operators != null && <Fact label="Операторы" value={String(team.operators)} />}
            {(team.femaleCount != null || team.maleCount != null) && (
              <Fact label="Состав" value={`${team.femaleCount ?? 0} женщин, ${team.maleCount ?? 0} мужчин`} />
            )}
            {team.hasTrainer && <Fact label="Тренер моделей" value={team.trainerNote || "Есть"} />}
          </div>
        </section>
      )}

      <section className="bg-white p-6 shadow-sm">
        <h2 className="font-medium">О {isStudio ? "студии" : "компании"}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{profile.description}</p>
        {(profile.telegramLink || profile.websiteUrl) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.telegramLink && (
              <a href={profile.telegramLink} target="_blank" rel="noopener noreferrer nofollow sponsored" className="rounded-lg bg-[#2AABEE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#229ED9]">
                Telegram-канал
              </a>
            )}
            {profile.websiteUrl && (
              <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer nofollow sponsored" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Сайт
              </a>
            )}
          </div>
        )}
      </section>

      {profile.owner.listings.length > 0 && (
        <section className="bg-white p-6 shadow-sm">
          <h2 className="font-medium">Вакансии {isStudio ? "студии" : "агентства"} «{profile.name}»</h2>
          <div className="mt-3 space-y-2 text-sm">
            {profile.owner.listings.map((listing) => (
              <Link key={listing.id} href={listingSeoPath(listing)} className="block rounded border p-3 hover:bg-zinc-50">
                <span className="font-medium">{listing.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">{listing.city || "Удалённо"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {profile.owner.articles.length > 0 && (
        <section className="bg-white p-6 shadow-sm">
          <h2 className="font-medium">Статьи от «{profile.name}»</h2>
          <div className="mt-3 space-y-2 text-sm">
            {profile.owner.articles.map((article) => (
              <Link key={article.id} href={articleSeoPath(article)} className="block rounded border p-3 hover:bg-zinc-50">
                <span className="font-medium">{article.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link href={`/profiles/${profile.ownerId}`} className="flex items-center justify-between rounded-lg bg-white p-4 text-sm font-semibold shadow-sm hover:bg-zinc-50">
        Профиль автора организации
        <span aria-hidden>→</span>
      </Link>

      <section className="bg-white p-6 shadow-sm">
        <h2 className="font-medium">Вопросы и ответы</h2>
        <div className="mt-3 space-y-3">
          {faq.map((item) => (
            <div key={item.question}>
              <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-5 text-zinc-500">
        Карточка заполняется организацией самостоятельно. MyCamDesk проверяет контакты и факт деятельности, но не
        гарантирует безопасность, доход или исполнение обещанных условий.
      </p>
    </article>
  );
}

export { buildFaq, quickAnswer };
