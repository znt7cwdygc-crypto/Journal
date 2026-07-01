import Link from "next/link";
import type { ReactNode } from "react";
import { saveListingAction, saveResumeAction } from "@/app/actions";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
import { listingSeoPath, resumeSeoPath } from "@/lib/seo-url";
import { maskContact } from "@/lib/validation";

function isModelResume(roleGoal: string) {
  const lower = roleGoal.toLowerCase();
  return lower === "модель" || lower.includes("модель");
}

type DirectoryUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  profileBio: string | null;
};

type DirectoryListing = {
  id: string;
  title: string;
  description: string;
  city: string | null;
  employmentType: string | null;
  contact: string;
  viewCount: number;
  responseCount: number;
  createdAt: Date;
  createdById: string;
  createdBy: DirectoryUser;
  reviews?: { rating: number | null }[];
  savedBy?: { userId: string }[];
};

type DirectoryResume = {
  id: string;
  userId: string;
  title: string;
  bio: string;
  city: string | null;
  roleGoal: string;
  experienceMonths: number;
  contactEmail: string | null;
  contactTelegram: string | null;
  viewCount: number;
  responseCount: number;
  updatedAt: Date;
  user: DirectoryUser;
  savedBy?: { userId: string }[];
};

function authorName(author: DirectoryUser) {
  return author.name || author.email || "Профиль автора";
}

function AuthorFooter({ author }: { author: DirectoryUser }) {
  return (
    <Link href={`/profiles/${author.id}`} className="mt-4 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 hover:text-hot">
      {author.image ? (
        <img className="h-8 w-8 shrink-0 rounded object-cover" src={author.image} alt={author.name || "Аватар автора"} />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-hot font-black text-white">
          {authorName(author).slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-zinc-800">{authorName(author)}</span>
        {author.profileBio && <span className="block truncate text-zinc-500">{author.profileBio}</span>}
      </span>
    </Link>
  );
}

function DirectoryActionRow({ children, columns }: { children: ReactNode; columns?: 3 | 4 }) {
  const compactClass = columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "";
  return <div className={columns ? `directory-actions mt-4 grid ${compactClass} gap-2` : "directory-actions mt-4 flex flex-wrap gap-2"}>{children}</div>;
}

function HiddenListingInputs({ listingId }: { listingId: string }) {
  return <input type="hidden" name="listingId" value={listingId} />;
}

function structuredValue(text: string, label: string) {
  const line = text.split("\n").find((item) => item.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function firstStructuredValue(text: string, labels: string[]) {
  for (const label of labels) {
    const value = structuredValue(text, label);
    if (value) return value;
  }
  return "";
}

function stripStructuredLines(text: string, labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return text
    .split("\n")
    .map((part) => part.trim())
    .filter((part) => part && !normalizedLabels.some((label) => part.toLowerCase().startsWith(`${label}:`)))
    .join("\n\n");
}

function listingSummary(description: string, kind: "VACANCY" | "SERVICE") {
  const summary = structuredValue(description, "Коротко");
  if (summary) return summary;

  const ignoredLabels =
    kind === "SERVICE"
      ? ["Категория", "Цена", "Комментарий к цене", "Что входит", "Опыт", "Портфолио", "Срок", "Доступность", "Ограничения", "Формат оказания", "Гарантии", "Формат оплаты", "Способ оплаты", "Предоплата", "Мин. объём заказа", "Бесплатная консультация", "Скидки", "Тип исполнителя", "Об исполнителе", "Контактное лицо", "Сайт", "Для кого", "Срок выполнения"]
      : ["Роль", "Оплата", "Комментарий к оплате", "График", "Занятость", "Требования", "Условия", "Дополнительные условия", "Кто не подойдет", "Работодатель", "Компания", "Район", "Контактное лицо", "Сайт"];

  return (
    description
      .split("\n")
      .map((part) => part.trim())
      .find((part) => part && !ignoredLabels.some((label) => part.toLowerCase().startsWith(`${label.toLowerCase()}:`))) ||
    description
  );
}

function resumeMoneyValue(bio: string) {
  const minimumPercent = structuredValue(bio, "Минимальный процент");
  const minimumIncome = structuredValue(bio, "Минимальный доход в месяц");
  if (minimumIncome && minimumPercent) return `от ${minimumIncome} / ${minimumPercent}`;
  if (minimumIncome) return `от ${minimumIncome}`;
  if (minimumPercent) return `от ${minimumPercent}`;
  const salary = structuredValue(bio, "Ожидаемая зарплата");
  if (salary) return salary;
  return firstStructuredValue(bio, ["Желаемый доход", "Желаемая зарплата", "Зарплата", "Ставка", "Доход"]);
}

function resumeSummary(bio: string) {
  const aboutIndex = bio.indexOf("О СЕБЕ");
  if (aboutIndex >= 0) {
    const afterAbout = bio.slice(aboutIndex + "О СЕБЕ".length).trim();
    const [about] = afterAbout.split("\n\n");
    if (about?.trim()) return about.trim();
  }
  return stripStructuredLines(bio, ["Минимальный процент", "Минимальный доход в месяц", "Желаемый доход", "Желаемая зарплата", "Зарплата", "Ставка", "Доход"]);
}

export function ListingDirectoryCard({
  listing,
  kind,
  topic,
  currentPath,
  isSignedIn
}: {
  listing: DirectoryListing;
  kind: "VACANCY" | "SERVICE";
  topic: string;
  currentPath: string;
  isSignedIn: boolean;
}) {
  const typeLabel = kind === "VACANCY" ? "Вакансия" : "Услуга";
  const kindClass = kind === "VACANCY" ? "bg-hot text-white" : "bg-sky text-white";
  const formatLabel = listing.employmentType || "Формат не указан";
  const ratings = (listing.reviews || []).map((review) => review.rating).filter((rating): rating is number => typeof rating === "number");
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
  const isService = kind === "SERVICE";
  const price = isService ? structuredValue(listing.description, "Цена") : firstStructuredValue(listing.description, ["Оплата", "Зарплата", "Ставка", "Доход"]);
  const shortDescription = listingSummary(listing.description, kind);
  const isSaved = Boolean(listing.savedBy?.length);
  const compactListing = kind === "VACANCY" || isService;
  const compactButtonClass = "btn h-10 w-full whitespace-nowrap px-1 text-[11px]";
  const listingPath = listingSeoPath({ ...listing, type: kind });
  const vacancyRole = kind === "VACANCY" ? firstStructuredValue(listing.description, ["Роль", "Должность"]) : "";
  const secondaryBadge = kind === "VACANCY" ? vacancyRole || "Роль не указана" : topic || formatLabel;

  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${kindClass}`}>{typeLabel}</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{secondaryBadge}</span>
        <span className="text-zinc-500">{listing.createdAt.toLocaleDateString("ru-RU")}</span>
      </div>

      <Link href={listingPath} className="block">
        <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{listing.title}</h3>
        {price && (
          <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">
            {price}
          </p>
        )}
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{shortDescription}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{listing.city || "Город не указан"}</span>
        <span>{formatLabel}</span>
        <span>Просмотры: {listing.viewCount + 1}</span>
        <span>Отклики: {listing.responseCount}</span>
        {kind === "SERVICE" && ratings.length > 0 && <span>Рейтинг: {averageRating.toFixed(1)} ({ratings.length})</span>}
      </div>

      {!compactListing && (
        <div className="mt-3 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">Контакт: </span>
          {isSignedIn ? listing.contact : maskContact(listing.contact)}
          {!isSignedIn && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью и отправить отклик.</p>}
        </div>
      )}

      <DirectoryActionRow columns={compactListing ? 3 : undefined}>
        {compactListing && <ContactReveal contact={listing.contact} signedIn={isSignedIn} compact targetType="LISTING" targetId={listing.id} />}
        <form action={saveListingAction}>
          <HiddenListingInputs listingId={listing.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className={compactListing ? `${compactButtonClass} btn-muted` : "btn btn-muted w-full"} type="submit">
            {compactListing ? (isSaved ? "Убрать" : "В избранное") : "Сохранить"}
          </button>
        </form>
        <ReportButton
          targetType="LISTING"
          targetId={listing.id}
          next={currentPath}
          buttonClassName={compactListing ? `${compactButtonClass} btn-danger` : "btn btn-danger w-full"}
        />
      </DirectoryActionRow>

      <AuthorFooter author={listing.createdBy} />
    </article>
  );
}

export function ResumeDirectoryCard({
  resume,
  currentPath
}: {
  resume: DirectoryResume;
  currentPath: string;
}) {
  const isSaved = Boolean(resume.savedBy?.length);
  const moneyValue = resumeMoneyValue(resume.bio);
  const shortBio = resumeSummary(resume.bio);
  const resumePath = resumeSeoPath(resume);

  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">Резюме</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{resume.roleGoal || "Роль не указана"}</span>
        <span className="text-zinc-500">{resume.updatedAt.toLocaleDateString("ru-RU")}</span>
      </div>

      <Link href={resumePath} className="block">
        <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{resume.title}</h3>
        {moneyValue && (
          <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">
            {moneyValue}
          </p>
        )}
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{shortBio}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{resume.city || "Город не указан"}</span>
        <span>Опыт: {resume.experienceMonths} мес</span>
        <span>Просмотры: {resume.viewCount + 1}</span>
        <span>Отклики: {resume.responseCount}</span>
      </div>

      <DirectoryActionRow columns={3}>
        <Link href={resumePath} className="btn btn-primary flex h-10 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-[11px]">
          <span>🔒</span>
          <span>${isModelResume(resume.roleGoal) ? "15" : "5"}</span>
        </Link>
        <form action={saveResumeAction}>
          <input type="hidden" name="resumeId" value={resume.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="btn btn-muted h-10 w-full whitespace-nowrap px-1 text-[11px]" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
        <ReportButton
          targetType="RESUME"
          targetId={resume.id}
          next={currentPath}
          buttonClassName="btn btn-danger h-10 w-full whitespace-nowrap px-1 text-[11px]"
        />
      </DirectoryActionRow>

      <AuthorFooter author={resume.user} />
    </article>
  );
}
