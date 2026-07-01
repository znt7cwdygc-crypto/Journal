import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { saveResumeAction } from "@/app/actions";
import { auth } from "@/auth";
import { ContactReveal } from "@/components/contact-reveal";
import { ImportanceBio } from "@/components/importance-bio";
import { ReportButton } from "@/components/report-button";
import { ReverseQuiz } from "@/components/reverse-quiz";
import { prisma } from "@/lib/prisma";
import { siteName, siteUrl, truncateSeo } from "@/lib/seo";
import { idFromSeoParam, pathTail, resumeSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

async function findResume(slug: string) {
  const resolved = idFromSeoParam(slug);
  return prisma.resume.findFirst({
    where: {
      isPublic: true,
      hiddenByInactivity: false,
      AND: [
        {
          OR: [
            ...(resolved.id ? [{ id: resolved.id }] : []),
            ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
            { id: slug }
          ]
        },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    },
    include: {
      user: true,
      savedBy: true
    }
  });
}

function contactValue(resume: NonNullable<Awaited<ReturnType<typeof findResume>>>) {
  return [resume.contactEmail, resume.contactTelegram].filter(Boolean).join(" • ") || "Контакт не указан";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const resume = await findResume(params.slug);
  if (!resume) return { title: "Резюме не найдено", robots: { index: false, follow: false } };
  const canonicalPath = resumeSeoPath(resume);
  const title = `${resume.title} — резюме`;
  const description = truncateSeo(resume.bio);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath
    }
  };
}

export default async function ResumeDetailsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { reported?: string; favorite?: string; invited?: string };
}) {
  const session = await auth();
  const resume = await findResume(params.slug);
  if (!resume) notFound();

  const resumePath = resumeSeoPath(resume);
  if (pathTail(resumePath) !== params.slug) {
    redirect(resumePath);
  }

  await prisma.resume.update({ where: { id: resume.id }, data: { viewCount: { increment: 1 } } });

  const isOwner = session?.user?.id === resume.userId;
  const viewerUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, accountMode: true }
      })
    : null;
  const isProvider = viewerUser
    ? viewerUser.accountMode === "PROVIDER" || viewerUser.accountMode === "BOTH"
    : false;
  const viewerBalance = viewerUser
    ? await prisma.studioBalance.findUnique({ where: { userId: viewerUser.id } })
    : null;
  const existingInvite = session?.user?.id
    ? await prisma.invite.findFirst({
        where: { resumeId: resume.id, studioId: session.user.id },
        orderBy: { createdAt: "desc" }
      })
    : null;

  const authorName = resume.user.name || resume.user.email || "Автор резюме";
  const isSaved = Boolean(session?.user?.id && resume.savedBy.some((item) => item.userId === session.user.id));
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Резюме добавлено в избранное."
      : searchParams?.favorite === "removed"
        ? "Резюме убрано из избранного."
        : null;

  return (
    <article className="bg-white p-5 shadow-sm sm:p-6">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            name: resume.title,
            description: truncateSeo(resume.bio),
            url: siteUrl(resumePath).toString(),
            mainEntity: {
              "@type": "Person",
              name: authorName,
              jobTitle: resume.roleGoal,
              description: resume.bio,
              image: resume.user.image || undefined,
              address: resume.city
                ? {
                    "@type": "PostalAddress",
                    addressLocality: resume.city,
                    addressCountry: "RU"
                  }
                : undefined
            },
            publisher: {
              "@type": "Organization",
              name: siteName,
              url: siteUrl("/").toString()
            }
          })
        }}
      />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Главная", "item": siteUrl("/").toString() },
              { "@type": "ListItem", "position": 2, "name": "Резюме", "item": siteUrl("/resumes").toString() },
              { "@type": "ListItem", "position": 3, "name": resume.title, "item": siteUrl(resumePath).toString() }
            ]
          })
        }}
      />
      <Link className="text-sm font-semibold text-accent" href="/resumes">Назад к резюме</Link>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-mint px-3 py-1 font-semibold text-ink">Резюме</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{resume.roleGoal || "Роль не указана"}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{resume.city || "Город не указан"}</span>
      </div>

      <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{resume.title}</h1>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600">
        <span>Опыт: {resume.experienceMonths} мес</span>
        <span>{resume.viewCount + 1} просмотров</span>
        <span>{resume.responseCount} откликов</span>
        <span>до {resume.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</span>
      </div>

      <ImportanceBio text={resume.bio} />

      {searchParams?.reported && (
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </div>
      )}
      {favoriteMessage && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {favoriteMessage}
        </div>
      )}

      {searchParams?.invited && (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Инвайт отправлен, ожидайте ответа модели.
        </div>
      )}

      <div className="directory-actions mt-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <form action={saveResumeAction}>
            <input type="hidden" name="resumeId" value={resume.id} />
            <input type="hidden" name="next" value={resumePath} />
            <button className="btn btn-muted h-10 w-full whitespace-nowrap px-1 text-[11px]" type="submit">
              {isSaved ? "Убрать" : "В избранное"}
            </button>
          </form>
          <ReportButton
            targetType="RESUME"
            targetId={resume.id}
            next={resumePath}
            buttonClassName="btn btn-danger h-10 w-full whitespace-nowrap px-1 text-[11px]"
          />
        </div>

        {isOwner ? (
          <ContactReveal contact={contactValue(resume)} signedIn={Boolean(session?.user)} compact targetType="RESUME" targetId={resume.id} />
        ) : existingInvite?.status === "ACCEPTED" ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <p className="font-semibold text-sky-800">Контакт раскрыт</p>
            <p className="mt-1 text-zinc-800">{contactValue(resume)}</p>
          </div>
        ) : existingInvite?.status === "PENDING" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Инвайт отправлен, ожидайте ответа
          </div>
        ) : (
          <ReverseQuiz
            resumeId={resume.id}
            bio={resume.bio}
            roleGoal={resume.roleGoal}
            signedIn={Boolean(session?.user)}
            canProvide={isProvider}
            hasBalance={Boolean(viewerBalance && viewerBalance.availableUsd > 0)}
          />
        )}
      </div>

      <Link href={`/profiles/${resume.userId}`} className="mt-6 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm hover:bg-zinc-100">
        {resume.user.image ? (
          <img className="h-10 w-10 rounded object-cover" src={resume.user.image} alt={authorName} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <span className="block font-medium text-zinc-900">{authorName}</span>
          {resume.user.profileBio && <span className="block text-xs leading-5 text-zinc-600">{resume.user.profileBio}</span>}
        </span>
      </Link>
    </article>
  );
}
