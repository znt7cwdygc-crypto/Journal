import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DirectoryProfileView, buildFaq } from "@/components/directory-profile-view";
import { addressRegionForCity } from "@/lib/city-region";
import { findDirectoryProfile } from "@/lib/directory-queries";
import { isCatalogEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";
import { directoryProfileSeoPath, pathTail } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (!isCatalogEnabled()) return { robots: { index: false, follow: false } };
  const profile = await findDirectoryProfile(params.slug, "STUDIO");
  if (!profile) return { title: "Студия не найдена", robots: { index: false, follow: false } };

  const title = `${profile.name} — вебкам-студия ${profile.city ? `в городе ${profile.city}` : "онлайн"}`;
  const description = truncateSeo(profile.summary);
  const canonicalPath = directoryProfileSeoPath(profile);
  const indexable = profile.profileCompleteness >= 70;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, url: canonicalPath, images: profile.coverUrl ? [profile.coverUrl] : undefined },
    robots: indexable ? undefined : { index: false, follow: true }
  };
}

export default async function StudioProfilePage({ params }: { params: { slug: string } }) {
  if (!isCatalogEnabled()) notFound();

  const session = await auth();
  const profile = await findDirectoryProfile(params.slug, "STUDIO");
  if (!profile) notFound();

  const path = directoryProfileSeoPath(profile);
  if (pathTail(path) !== params.slug) redirect(path);

  await prisma.directoryProfile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 } } });

  const faq = buildFaq(profile);
  const addressLocality = profile.city || undefined;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": profile.addressIsPublic && profile.city ? "LocalBusiness" : "Organization",
    name: profile.name,
    description: truncateSeo(profile.description, 300),
    url: siteUrl(path).toString(),
    image: profile.logoUrl || undefined,
    ...(profile.addressIsPublic && profile.city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality,
            addressRegion: addressRegionForCity(profile.city),
            addressCountry: "RU"
          }
        }
      : {})
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer }
            }))
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
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl("/").toString() },
              { "@type": "ListItem", position: 2, name: "Студии", item: siteUrl("/studios").toString() },
              { "@type": "ListItem", position: 3, name: profile.name }
            ]
          })
        }}
      />
      <DirectoryProfileView profile={profile} signedIn={Boolean(session?.user)} />
    </>
  );
}
