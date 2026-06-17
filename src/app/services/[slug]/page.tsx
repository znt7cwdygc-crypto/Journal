import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDirectoryCard } from "@/components/directory-card";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { getSeoLanding, seoLandingsByKind } from "@/lib/seo-landings";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return seoLandingsByKind("service").map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = getSeoLanding("service", params.slug);
  if (!landing) return { title: "Услуги не найдены", robots: { index: false, follow: false } };

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

function serviceTerms(slug: string) {
  if (slug === "obs") return ["obs", "свет", "камера", "техничес"];
  if (slug === "legal") return ["юрист", "договор", "прав", "удален"];
  if (slug === "security") return ["безопас", "удален", "репутац", "контент"];
  return ["коуч", "настав", "рост", "доход"];
}

export default async function ServiceLandingPage({ params }: { params: { slug: string } }) {
  const landing = getSeoLanding("service", params.slug);
  if (!landing) notFound();
  const session = await auth();

  const terms = serviceTerms(params.slug);
  const services = await prisma.listing.findMany({
    where: {
      type: "SERVICE",
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      AND: [
        {
          OR: terms.flatMap((term) => [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } }
          ])
        }
      ]
    },
    include: { createdBy: true, reviews: { where: { parentId: null, isHidden: false }, select: { rating: true } } },
    orderBy: { createdAt: "desc" },
    take: 6
  });

  return (
    <SeoLandingPage landing={landing}>
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Подходящие услуги</h2>
          <Link href="/services" className="text-sm font-medium text-accent hover:text-teal-900">
            Все услуги
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {services.length === 0 && <p className="text-sm text-zinc-600">Пока нет точных совпадений. Можно открыть общий каталог услуг или самому разместить услугу в кабинете.</p>}
          {services.map((item) => (
            <ListingDirectoryCard key={item.id} listing={item} kind="SERVICE" topic={landing.keywords[0] || "Услуга"} currentPath={landing.path} isSignedIn={Boolean(session?.user)} />
          ))}
        </div>
      </section>
    </SeoLandingPage>
  );
}
