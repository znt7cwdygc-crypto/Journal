import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { getSeoLanding, seoLandingsByKind } from "@/lib/seo-landings";

export function generateStaticParams() {
  return seoLandingsByKind("guide").map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const landing = getSeoLanding("guide", params.slug);
  if (!landing) return { title: "Гайд не найден", robots: { index: false, follow: false } };

  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: landing.path },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: landing.path,
      type: "article"
    }
  };
}

export default function GuideLandingPage({ params }: { params: { slug: string } }) {
  const landing = getSeoLanding("guide", params.slug);
  if (!landing) notFound();

  return <SeoLandingPage landing={landing} />;
}
