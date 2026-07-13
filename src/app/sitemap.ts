import type { MetadataRoute } from "next";
import { distinctDirectoryCities, distinctDirectoryPlatforms } from "@/lib/directory-queries";
import { isCatalogEnabled } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { articleSeoPath, directoryProfileSeoPath, listingSeoPath, matchProfileSeoPath, productSeoPath, resumeSeoPath, slugifyTranslit } from "@/lib/seo-url";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const CATALOG_INDEX_THRESHOLD = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    ["", 1, "daily"],
    ["/articles", 0.9, "hourly"],
    ["/authors", 0.8, "daily"],
    ["/vacancies", 0.8, "hourly"],
    ["/services", 0.8, "hourly"],
    ["/products", 0.75, "hourly"],
    ["/resumes", 0.7, "hourly"],
    ["/model-operator", 0.75, "hourly"],
    ["/stories", 0.75, "daily"],
    ["/money", 0.75, "daily"],
    ["/safety", 0.75, "daily"],
    ["/work", 0.75, "daily"],
    ["/guides", 0.8, "daily"],
    ["/links", 0.5, "weekly"],
    ...(isCatalogEnabled() ? ([["/studios", 0.8, "daily"], ["/agencies", 0.8, "daily"]] as const) : [])
  ].map(([path, priority, changeFrequency]) => ({
    url: siteUrl(String(path)).toString(),
    lastModified: now,
    priority: Number(priority),
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"]
  }));

  const guides = await prisma.guide.findMany({
    where: { isPublished: true },
    select: { path: true, kind: true, updatedAt: true }
  });

  const seoRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: siteUrl(guide.path).toString(),
    lastModified: guide.updatedAt,
    priority: guide.kind === "guide" ? 0.75 : 0.7,
    changeFrequency: "weekly" as const
  }));

  try {
    const [articles, profiles, listings, products, resumes, matchProfiles, directoryProfiles] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, updatedAt: true, publishedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { articles: { some: { status: "PUBLISHED" } } },
            { resume: { is: { isPublic: true, hiddenByInactivity: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } }
          ]
        },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      prisma.listing.findMany({
        where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, type: true, title: true, city: true, employmentType: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      prisma.product.findMany({
        where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, title: true, category: true, city: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      prisma.resume.findMany({
        where: { isPublic: true, hiddenByInactivity: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, title: true, city: true, roleGoal: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      prisma.matchProfile.findMany({
        where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        select: { id: true, title: true, city: true, seekerRole: true, lookingFor: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000
      }),
      isCatalogEnabled()
        ? prisma.directoryProfile.findMany({
            where: { status: "PUBLISHED", profileCompleteness: { gte: 70 } },
            select: { id: true, type: true, name: true, city: true, slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 500
          })
        : Promise.resolve([])
    ]);

    let catalogSubPages: MetadataRoute.Sitemap = [];
    if (isCatalogEnabled()) {
      const [studioCities, agencyPlatforms] = await Promise.all([distinctDirectoryCities("STUDIO"), distinctDirectoryPlatforms("AGENCY")]);
      const [studioCounts, platformCounts] = await Promise.all([
        Promise.all(studioCities.map((city) => prisma.directoryProfile.count({ where: { type: "STUDIO", status: "PUBLISHED", city } }))),
        Promise.all(agencyPlatforms.map((platform) => prisma.directoryProfile.count({ where: { type: "AGENCY", status: "PUBLISHED", platforms: { has: platform } } })))
      ]);

      catalogSubPages = [
        ...studioCities
          .map((city, index) => ({ city, count: studioCounts[index] }))
          .filter(({ count }) => count >= CATALOG_INDEX_THRESHOLD)
          .map(({ city }) => ({ url: siteUrl(`/studios/${slugifyTranslit(city)}`).toString(), lastModified: now, priority: 0.7, changeFrequency: "daily" as const })),
        ...agencyPlatforms
          .map((platform, index) => ({ platform, count: platformCounts[index] }))
          .filter(({ count }) => count >= CATALOG_INDEX_THRESHOLD)
          .map(({ platform }) => ({ url: siteUrl(`/agencies/${platform.toLowerCase()}`).toString(), lastModified: now, priority: 0.7, changeFrequency: "daily" as const }))
      ];
    }

    return [
      ...staticRoutes,
      ...seoRoutes,
      ...articles.map((article) => ({
        url: siteUrl(articleSeoPath(article)).toString(),
        lastModified: article.updatedAt || article.publishedAt || now,
        priority: 0.85,
        changeFrequency: "weekly" as const
      })),
      ...profiles.map((profile) => ({
        url: siteUrl(`/profiles/${profile.id}`).toString(),
        lastModified: profile.updatedAt || now,
        priority: 0.6,
        changeFrequency: "weekly" as const
      })),
      ...listings.map((listing) => ({
        url: siteUrl(listingSeoPath(listing)).toString(),
        lastModified: listing.updatedAt || now,
        priority: 0.7,
        changeFrequency: "weekly" as const
      })),
      ...products.map((product) => ({
        url: siteUrl(productSeoPath(product)).toString(),
        lastModified: product.updatedAt || now,
        priority: 0.65,
        changeFrequency: "weekly" as const
      })),
      ...resumes.map((resume) => ({
        url: siteUrl(resumeSeoPath(resume)).toString(),
        lastModified: resume.updatedAt || now,
        priority: 0.65,
        changeFrequency: "weekly" as const
      })),
      ...matchProfiles.map((profile) => ({
        url: siteUrl(matchProfileSeoPath(profile)).toString(),
        lastModified: profile.updatedAt || now,
        priority: 0.65,
        changeFrequency: "weekly" as const
      })),
      ...directoryProfiles.map((profile) => ({
        url: siteUrl(directoryProfileSeoPath(profile)).toString(),
        lastModified: profile.updatedAt || now,
        priority: 0.7,
        changeFrequency: "weekly" as const
      })),
      ...catalogSubPages
    ];
  } catch {
    return [...staticRoutes, ...seoRoutes];
  }
}
