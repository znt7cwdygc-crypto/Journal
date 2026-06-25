import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ListingDirectoryCard } from "@/components/directory-card";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { parseGuide } from "@/lib/guide-helpers";
import { prisma } from "@/lib/prisma";
import { seoLandingsByKind } from "@/lib/seo-landings";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return seoLandingsByKind("vacancy").map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "vacancy", isPublished: true } });
  if (!guide) return { title: "Вакансии не найдены", robots: { index: false, follow: false } };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: guide.path },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: guide.path
    }
  };
}

function vacancyWhere(slug: string) {
  if (slug === "operator") {
    return {
      OR: [
        { title: { contains: "оператор", mode: "insensitive" as const } },
        { description: { contains: "оператор", mode: "insensitive" as const } }
      ]
    };
  }

  if (slug === "remote") {
    return {
      OR: [
        { employmentType: "REMOTE" as const },
        { city: { contains: "удален", mode: "insensitive" as const } },
        { title: { contains: "удален", mode: "insensitive" as const } },
        { description: { contains: "удален", mode: "insensitive" as const } }
      ]
    };
  }

  return {
    OR: [
      { title: { contains: "модель", mode: "insensitive" as const } },
      { description: { contains: "модель", mode: "insensitive" as const } },
      { title: { contains: "webcam", mode: "insensitive" as const } },
      { description: { contains: "webcam", mode: "insensitive" as const } }
    ]
  };
}

export default async function VacancyLandingPage({ params }: { params: { slug: string } }) {
  const guide = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "vacancy", isPublished: true } });
  if (!guide) notFound();
  const landing = parseGuide(guide);
  const session = await auth();

  const vacancies = await prisma.listing.findMany({
    where: {
      type: "VACANCY",
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      AND: [vacancyWhere(params.slug)]
    },
    include: {
      createdBy: true,
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 6
  });

  return (
    <SeoLandingPage landing={landing}>
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Актуальные вакансии</h2>
          <Link href="/vacancies" className="text-sm font-medium text-accent hover:text-teal-900">
            Все вакансии
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {vacancies.length === 0 && <p className="text-sm text-zinc-600">Пока нет точных совпадений, но можно посмотреть общий раздел вакансий или разместить резюме.</p>}
          {vacancies.map((item) => (
            <ListingDirectoryCard key={item.id} listing={item} kind="VACANCY" topic={item.employmentType || "Формат не указан"} currentPath={landing.path} isSignedIn={Boolean(session?.user)} />
          ))}
        </div>
      </section>
    </SeoLandingPage>
  );
}
