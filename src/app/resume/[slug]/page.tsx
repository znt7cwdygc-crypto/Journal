import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { saveResumeAction } from "@/app/actions";
import { auth } from "@/auth";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
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
  searchParams?: { reported?: string; favorite?: string };
}) {
  const session = await auth();
  const resume = await findResume(params.slug);
  if (!resume) notFound();

  const resumePath = resumeSeoPath(resume);
  if (pathTail(resumePath) !== params.slug) {
    redirect(resumePath);
  }

  await prisma.resume.update({ where: { id: resume.id }, data: { viewCount: { increment: 1 } } });

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

      <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-zinc-800">{resume.bio}</p>

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

      <div className="directory-actions mt-5 grid grid-cols-3 gap-2">
        <ContactReveal contact={contactValue(resume)} signedIn={Boolean(session?.user)} compact />
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
