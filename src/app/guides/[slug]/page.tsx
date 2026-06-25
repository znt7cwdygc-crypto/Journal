import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { parseGuide } from "@/lib/guide-helpers";
import { prisma } from "@/lib/prisma";
import { seoLandingsByKind } from "@/lib/seo-landings";

export function generateStaticParams() {
  return seoLandingsByKind("guide").map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "guide", isPublished: true } });
  if (!guide) return { title: "Гайд не найден", robots: { index: false, follow: false } };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: guide.path },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: guide.path,
      type: "article"
    }
  };
}

export default async function GuideLandingPage({ params }: { params: { slug: string } }) {
  const guide = await prisma.guide.findFirst({ where: { slug: params.slug, kind: "guide", isPublished: true } });
  if (!guide) notFound();

  return <SeoLandingPage landing={parseGuide(guide)} />;
}
