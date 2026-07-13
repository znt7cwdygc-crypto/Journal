import Link from "next/link";
import { followAuthorAction, saveDirectoryProfileAction } from "@/app/actions";
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
import { buildFaq, quickAnswer } from "@/lib/directory-faq";
import type { DirectoryProfileWithFullOwner } from "@/lib/directory-queries";
import { safeImageUrl } from "@/lib/media";
import { articleSeoPath, directoryProfileSeoPath, listingSeoPath, productSeoPath, resumeSeoPath } from "@/lib/seo-url";

const numberFormat = new Intl.NumberFormat("ru-RU");

function Stat({ k, v, note }: { k: string; v: string; note?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <div className="text-[10.5px] uppercase tracking-wide text-zinc-400">{k}</div>
      <div className="mt-1 text-[17px] font-bold tabular-nums text-zinc-900">{v}</div>
      {note && <div className="mt-0.5 text-[11.5px] text-zinc-400">{note}</div>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0">
      <span className="min-w-[160px] shrink-0 text-zinc-500">{label}</span>
      <span className="whitespace-pre-wrap font-medium text-zinc-800">{value}</span>
    </div>
  );
}

export function OrganizationProfileView({
  profile,
  session,
  isFollowing,
  searchParams
}: {
  profile: DirectoryProfileWithFullOwner;
  session: { user?: { id: string } } | null;
  isFollowing: boolean;
  searchParams?: { follow?: string; reported?: string; favorite?: string };
}) {
  const user = profile.owner;
  const isStudio = profile.type === "STUDIO";
  const path = directoryProfileSeoPath(profile);
  const team = isStudio ? parseJson<TeamComposition>(profile.teamComposition, {}) : {};
  const penalties = isStudio ? parseJson<Penalty[]>(profile.penalties, []) : [];
  const logo = safeImageUrl(profile.logoUrl);
  const verified = profile.verificationStatus === "VERIFIED";
  const faq = buildFaq(profile);
  const photos = profile.photos.map((p) => safeImageUrl(p)).filter((p): p is string => Boolean(p));

  const useful = user.articles.reduce((sum, article) => sum + article.ratings.filter((r) => r.value >= 4).length, 0);
  const comments = user.articles.reduce((sum, article) => sum + article.comments.length, 0);
  const usefulnessRating = user.articles.length ? Math.round((useful / user.articles.length) * 10) / 10 : 0;
  const isOwnProfile = session?.user?.id === user.id;
  const activeAuthor = user.articles.length >= 3;
  const listingsByType = (t: "VACANCY" | "SERVICE") => user.listings.filter((l) => l.type === t);

  const favoriteMessage =
    searchParams?.favorite === "added" ? "Организация добавлена в избранное." : searchParams?.favorite === "removed" ? "Организация убрана из избранного." : null;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 text-xs text-zinc-500">
        <Link href="/" className="hover:text-hot">Главная</Link>
        <span>/</span>
        <Link href={isStudio ? "/studios" : "/agencies"} className="hover:text-hot">{isStudio ? "Студии" : "Агентства"}</Link>
        <span>/</span>
        <span className="text-zinc-700">{profile.name}</span>
      </nav>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {logo ? (
            <SafeImage
              className="h-24 w-24 rounded-lg object-cover"
              src={logo}
              alt={profile.name}
              fallback={
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-hot text-3xl font-black text-white">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
              }
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-hot text-3xl font-black text-white">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{profile.name}</h1>
              {verified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ проверено</span>}
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {isStudio ? "Студия" : "Агентство"} · {profile.city || "Онлайн"}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">{profile.summary}</p>

            {(profile.telegramLink || profile.websiteUrl) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.telegramLink && (
                  <a href={profile.telegramLink} target="_blank" rel="noopener noreferrer nofollow sponsored" className="inline-flex items-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#229ED9]">
                    Telegram-канал
                  </a>
                )}
                {profile.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer nofollow sponsored" className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
                    Перейти на сайт
                  </a>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-hot">{user.articles.length} статей</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{comments} комментариев</span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-amber-800">{useful} полезных реакций</span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-amber-800">рейтинг полезности {usefulnessRating}</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-accent">{listingsByType("VACANCY").length} вакансий</span>
              <span className="rounded-full bg-mint px-3 py-1 font-medium text-ink">{user.products.length} товаров</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">{user.authorFollowers.length} подписчиков</span>
              {activeAuthor && <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">активный автор</span>}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {profile.contactLink && (
                <ContactReveal contact={profile.contactLink} signedIn={Boolean(session?.user)} compact targetType="DIRECTORY_PROFILE" targetId={profile.id} />
              )}
              <form action={saveDirectoryProfileAction}>
                <input type="hidden" name="directoryProfileId" value={profile.id} />
                <input type="hidden" name="next" value={path} />
                <button className="h-10 w-full rounded-lg bg-zinc-100 px-1 text-[11px] font-semibold text-zinc-800 sm:w-auto sm:px-4" type="submit">
                  В избранное
                </button>
              </form>
              {!isOwnProfile && (
                <form action={followAuthorAction}>
                  <input type="hidden" name="authorId" value={user.id} />
                  <input type="hidden" name="next" value={path} />
                  <button className="h-10 w-full rounded-lg bg-ink px-1 text-[11px] font-semibold text-white sm:w-auto sm:px-4" type="submit">
                    {isFollowing ? "Отписаться" : "Подписаться"}
                  </button>
                </form>
              )}
              <ReportButton
                targetType="DIRECTORY_PROFILE"
                targetId={profile.id}
                next={path}
                buttonLabel="Пожаловаться"
                buttonClassName="h-10 w-full rounded-lg bg-red-50 px-1 text-[11px] font-semibold text-red-700 sm:w-auto sm:px-4"
              />
            </div>

            {(searchParams?.reported || searchParams?.follow || favoriteMessage) && (
              <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {searchParams?.reported
                  ? "Жалоба отправлена в модерацию."
                  : searchParams?.follow === "added"
                    ? "Вы подписались на автора."
                    : searchParams?.follow === "removed"
                      ? "Вы отписались от автора."
                      : favoriteMessage}
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 border border-zinc-200 bg-white p-3 text-sm shadow-sm">
        <a className="rounded-lg bg-hot px-3 py-2 font-semibold text-white" href="#terms">{isStudio ? "Условия студии" : "Условия агентства"}</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#articles">Статьи</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#discussions">Обсуждения</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#vacancies">Вакансии</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#services">Услуги</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#products">Товары</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#resume">Резюме</a>
      </nav>

      <section id="terms" className="rounded-xl bg-white p-5 shadow-sm">
        <span className="inline-flex rounded bg-amber-50 px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-amber-800">Заполнено {isStudio ? "студией" : "агентством"}</span>
        <h2 className="mt-2 text-lg font-semibold">Условия {isStudio ? "студии" : "агентства"} {profile.name}</h2>

        <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-accent">Коротко</div>
          <p className="mt-1 text-sm leading-6 text-zinc-800">{quickAnswer(profile)}</p>
        </div>

        {profile.lastDataConfirmedAt && (
          <p className="mt-3 text-xs text-zinc-500">Данные подтверждены: {profile.lastDataConfirmedAt.toLocaleDateString("ru-RU")}</p>
        )}

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.04em] text-zinc-400">{isStudio ? "Процент и выплаты" : "Доля и выплаты"}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {isStudio ? (
            <>
              {profile.percentMin != null && (
                <Stat k="Процент модели" v={profile.percentMax ? `${profile.percentMin}-${profile.percentMax}%` : `${profile.percentMin}%`} />
              )}
              {profile.payoutSchedule && <Stat k="Выплаты" v={profile.payoutSchedule} />}
            </>
          ) : (
            <>
              {profile.agencySharePercent != null && <Stat k="Доля агентства" v={`${profile.agencySharePercent}%`} />}
              {profile.modelsCount != null && <Stat k="Моделей в работе" v={numberFormat.format(profile.modelsCount)} />}
            </>
          )}
          {profile.foundedYear && <Stat k="Год основания" v={String(profile.foundedYear)} />}
        </div>

        <div className="mt-3">
          {profile.workFormats.length > 0 && <Fact label="Формат работы" value={profile.workFormats.map(workFormatLabel).join(", ")} />}
          {profile.platforms.length > 0 && <Fact label="Платформы" value={profile.platforms.map(platformLabel).join(", ")} />}
          {isStudio && profile.audiences.length > 0 && <Fact label="Кого набирают" value={profile.audiences.map(audienceLabel).join(", ")} />}
          {!isStudio && profile.agencyIncludes.length > 0 && <Fact label="Что входит" value={profile.agencyIncludes.map(agencyIncludeLabel).join(", ")} />}
        </div>

        {isStudio && penalties.length > 0 && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.04em] text-zinc-400">Правила и штрафы</p>
            <ul className="mt-2 space-y-1.5">
              {penalties.map((penalty, index) => (
                <li key={index} className="flex gap-2 text-sm leading-6 text-zinc-700">
                  <span className="text-accent">✓</span>
                  {penalty.label}
                </li>
              ))}
            </ul>
          </>
        )}

        {isStudio && (profile.roomsCount != null || profile.equipment || profile.livingConditions || profile.district || profile.landmark) && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.04em] text-zinc-400">Комнаты и быт</p>
            <div className="mt-2">
              {profile.district && <Fact label="Район" value={profile.district} />}
              {profile.landmark && <Fact label="Ориентир" value={profile.landmark} />}
              {profile.addressIsPublic && profile.privateAddress && <Fact label="Адрес" value={profile.privateAddress} />}
              {profile.roomsCount != null && <Fact label="Комнат" value={String(profile.roomsCount)} />}
              {profile.hasAccommodation && <Fact label="Проживание" value="Есть общежитие / проживание" />}
              {profile.equipment && <Fact label="Оборудование" value={profile.equipment} />}
              {profile.livingConditions && <Fact label="Бытовые условия" value={profile.livingConditions} />}
            </div>
          </>
        )}

        {photos.length > 0 && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.04em] text-zinc-400">Фото</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <img key={photo} src={photo} alt={profile.name} className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          </>
        )}

        {isStudio && (team.admins || team.operators || team.femaleCount || team.maleCount || team.hasTrainer) && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.04em] text-zinc-400">Команда</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {team.admins != null && <Stat k="Администраторы" v={String(team.admins)} />}
              {team.operators != null && <Stat k="Операторы" v={String(team.operators)} />}
              {(team.femaleCount != null || team.maleCount != null) && <Stat k="Состав" v={`${team.femaleCount ?? 0} / ${team.maleCount ?? 0}`} note="женщин / мужчин" />}
              {team.hasTrainer && <Stat k="Тренер моделей" v="Есть" note={team.trainerNote || undefined} />}
            </div>
          </>
        )}

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{profile.description}</p>

        <div className="mt-4 border-t border-dashed border-zinc-200 pt-3 text-xs leading-5 text-zinc-500">
          Раздел заполнен {isStudio ? "студией" : "агентством"} самостоятельно по шаблону вопросов MyCamDesk. Редакция проверяет контакты и полноту, но не
          гарантирует достоверность условий, безопасность или доход — сверяйте детали перед стартом.
        </div>

        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
          <h3 className="text-sm font-semibold text-zinc-900">Вопросы и ответы</h3>
          {faq.map((item) => (
            <div key={item.question}>
              <p className="text-sm font-semibold text-zinc-900">{item.question}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-700">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {user.resume && (
        <section id="resume" className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-medium">Резюме</h2>
          <Link href={resumeSeoPath(user.resume)} className="mt-2 block font-medium hover:text-hot">{user.resume.title}</Link>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{user.resume.bio}</p>
        </section>
      )}

      <section id="articles" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Статьи от «{profile.name}»</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.articles.length === 0 && <p className="text-zinc-500">Пока нет опубликованных статей.</p>}
          {user.articles.map((article) => (
            <Link key={article.id} href={articleSeoPath(article)} className="block rounded border p-3 hover:bg-zinc-50">
              <span className="font-medium">{article.title}</span>
              <span className="mt-1 block text-xs text-zinc-500">{article.comments.length} комментариев • {article.ratings.filter((r) => r.value >= 4).length} полезных реакций</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="discussions" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Обсуждения автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.articleComments.length === 0 && <p className="text-zinc-500">Пока нет комментариев.</p>}
          {user.articleComments.map((comment) => (
            <Link key={comment.id} href={`${articleSeoPath(comment.article)}#comments`} className="block rounded border p-3 hover:bg-zinc-50">
              <span className="font-medium">{comment.article.title}</span>
              <span className="mt-1 block text-xs text-zinc-500">{comment.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="vacancies" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Вакансии {isStudio ? "студии" : "агентства"} «{profile.name}»</h2>
        <div className="mt-3 space-y-2 text-sm">
          {listingsByType("VACANCY").length === 0 && <p className="text-zinc-500">Пока нет вакансий.</p>}
          {listingsByType("VACANCY").map((listing) => (
            <Link key={listing.id} href={listingSeoPath(listing)} className="block rounded border p-2 hover:bg-zinc-50">
              <p className="font-medium">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.city || "Удаленно"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="services" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Услуги {isStudio ? "студии" : "агентства"}</h2>
        <div className="mt-3 space-y-2 text-sm">
          {listingsByType("SERVICE").length === 0 && <p className="text-zinc-500">Пока нет услуг.</p>}
          {listingsByType("SERVICE").map((listing) => (
            <Link key={listing.id} href={listingSeoPath(listing)} className="block rounded border p-2 hover:bg-zinc-50">
              <p className="font-medium">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.city || "Удаленно"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="products" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Товары</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.products.length === 0 && <p className="text-zinc-500">Пока нет товаров.</p>}
          {user.products.map((product) => (
            <Link key={product.id} href={productSeoPath(product)} className="flex items-center gap-3 rounded border p-2 hover:bg-zinc-50">
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.title}</span>
                <span className="text-xs text-zinc-500">{product.category} • {new Intl.NumberFormat("ru-RU").format(product.priceRub)} ₽</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
