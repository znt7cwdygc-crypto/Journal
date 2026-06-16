import Link from "next/link";
import type { ReactNode } from "react";
import { reportContentAction, respondToListingAction, respondToResumeAction, saveListingAction } from "@/app/actions";
import { maskContact } from "@/lib/validation";

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

function DirectoryActionRow({ children }: { children: ReactNode }) {
  return <div className="directory-actions mt-4 flex flex-wrap gap-2">{children}</div>;
}

function HiddenListingInputs({ listingId }: { listingId: string }) {
  return <input type="hidden" name="listingId" value={listingId} />;
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
  const reportReason = kind === "VACANCY" ? "Жалоба на вакансию" : "Жалоба на услугу";
  const kindClass = kind === "VACANCY" ? "bg-hot text-white" : "bg-sky text-white";
  const formatLabel = listing.employmentType || "Формат не указан";

  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-semibold ${kindClass}`}>{typeLabel}</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{topic || formatLabel}</span>
        <span className="text-zinc-500">{listing.createdAt.toLocaleDateString("ru-RU")}</span>
      </div>

      <Link href={`/listings/${listing.id}`} className="block">
        <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{listing.title}</h3>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{listing.description}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{listing.city || "Город не указан"}</span>
        <span>{formatLabel}</span>
        <span>Просмотры: {listing.viewCount + 1}</span>
        <span>Отклики: {listing.responseCount}</span>
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">Контакт: </span>
        {isSignedIn ? listing.contact : maskContact(listing.contact)}
        {!isSignedIn && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью и отправить отклик.</p>}
      </div>

      <DirectoryActionRow>
        <form action={respondToListingAction}>
          <HiddenListingInputs listingId={listing.id} />
          <button className="btn btn-primary w-full" type="submit">
            Откликнуться
          </button>
        </form>
        <form action={saveListingAction}>
          <HiddenListingInputs listingId={listing.id} />
          <button className="btn btn-muted w-full" type="submit">
            Сохранить
          </button>
        </form>
        <form action={reportContentAction}>
          <input type="hidden" name="targetType" value="LISTING" />
          <input type="hidden" name="targetId" value={listing.id} />
          <input type="hidden" name="reason" value={reportReason} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="btn btn-danger w-full" type="submit">
            Жалоба
          </button>
        </form>
      </DirectoryActionRow>

      <AuthorFooter author={listing.createdBy} />
    </article>
  );
}

export function ResumeDirectoryCard({
  resume,
  canSeeContacts
}: {
  resume: DirectoryResume;
  canSeeContacts: boolean;
}) {
  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">Резюме</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{resume.roleGoal || "Роль не указана"}</span>
        <span className="text-zinc-500">{resume.updatedAt.toLocaleDateString("ru-RU")}</span>
      </div>

      <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{resume.title}</h3>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{resume.bio}</p>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{resume.city || "Город не указан"}</span>
        <span>Опыт: {resume.experienceMonths} мес</span>
        <span>Просмотры: {resume.viewCount + 1}</span>
        <span>Отклики: {resume.responseCount}</span>
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        {canSeeContacts ? (
          <>
            <p>
              <span className="font-medium text-zinc-900">Email: </span>
              {resume.contactEmail || "-"}
            </p>
            <p>
              <span className="font-medium text-zinc-900">Telegram: </span>
              {resume.contactTelegram || "-"}
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">Войдите, чтобы видеть контакт полностью.</p>
        )}
      </div>

      <DirectoryActionRow>
        <form action={respondToResumeAction}>
          <input type="hidden" name="resumeId" value={resume.id} />
          <button className="btn btn-primary w-full" type="submit">
            Откликнуться
          </button>
        </form>
        <Link className="btn btn-ghost" href={`/profiles/${resume.userId}`}>
          Профиль
        </Link>
      </DirectoryActionRow>

      <AuthorFooter author={resume.user} />
    </article>
  );
}
