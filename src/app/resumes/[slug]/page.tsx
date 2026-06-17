import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ResumeDirectoryCard } from "@/components/directory-card";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { getSeoLanding, seoLandingsByKind } from "@/lib/seo-landings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return seoLandingsByKind("resume").map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = getSeoLanding("resume", params.slug);
  if (!landing) return { title: "Резюме не найдены", robots: { index: false, follow: false } };

  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: landing.path },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: landing.path
    }
  };
}

export default async function ResumeLandingPage({ params }: { params: { slug: string } }) {
  const landing = getSeoLanding("resume", params.slug);
  if (!landing) notFound();
  const session = await auth();
  const now = new Date();

  const term = params.slug === "operators" ? "оператор" : "модель";
  const resumes = await prisma.resume.findMany({
    where: {
      isPublic: true,
      hiddenByInactivity: false,
      expiresAt: { gt: now },
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { roleGoal: { contains: term, mode: "insensitive" } },
        { bio: { contains: term, mode: "insensitive" } }
      ]
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
    take: 6
  });

  return (
    <SeoLandingPage landing={landing}>
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Публичные резюме</h2>
          <Link href="/resumes" className="text-sm font-medium text-accent hover:text-teal-900">
            Все резюме
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {resumes.length === 0 && <p className="text-sm text-zinc-600">Пока нет точных совпадений. Можно открыть общий раздел резюме или разместить свое.</p>}
          {resumes.map((item) => (
            <ResumeDirectoryCard key={item.id} resume={item} canSeeContacts={Boolean(session?.user)} />
          ))}
        </div>
      </section>
    </SeoLandingPage>
  );
}
