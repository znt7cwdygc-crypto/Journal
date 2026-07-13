import { prisma } from "@/lib/prisma";
import { idFromSeoParam } from "@/lib/seo-url";

export async function findDirectoryProfile(slug: string, type: "STUDIO" | "AGENCY") {
  const resolved = idFromSeoParam(slug);

  return prisma.directoryProfile.findFirst({
    where: {
      type,
      status: "PUBLISHED",
      OR: [
        { slug },
        ...(resolved.id ? [{ id: resolved.id }] : []),
        ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
        { id: slug }
      ]
    },
    include: {
      owner: {
        include: {
          articles: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 5 },
          listings: {
            where: {
              status: "PUBLISHED",
              type: "VACANCY",
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
            },
            orderBy: { createdAt: "desc" },
            take: 5
          }
        }
      },
      savedBy: true
    }
  });
}

export type DirectoryProfileWithRelations = NonNullable<Awaited<ReturnType<typeof findDirectoryProfile>>>;

/** Full merged organization/author profile — powers the canonical /studios, /agencies page. */
export async function findDirectoryProfileWithFullOwner(slug: string, type: "STUDIO" | "AGENCY") {
  const resolved = idFromSeoParam(slug);
  const now = new Date();

  return prisma.directoryProfile.findFirst({
    where: {
      type,
      status: "PUBLISHED",
      OR: [
        { slug },
        ...(resolved.id ? [{ id: resolved.id }] : []),
        ...(resolved.shortId ? [{ id: { endsWith: resolved.shortId } }] : []),
        { id: slug }
      ]
    },
    include: {
      owner: {
        include: {
          articles: {
            where: { status: "PUBLISHED" },
            include: { ratings: true, comments: true },
            orderBy: { createdAt: "desc" },
            take: 10
          },
          listings: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 10 },
          products: {
            where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { id: true, title: true, category: true, priceRub: true },
            orderBy: { createdAt: "desc" },
            take: 10
          },
          resume: true,
          authorFollowers: true,
          articleComments: { include: { article: true }, orderBy: { createdAt: "desc" }, take: 10 }
        }
      },
      savedBy: true
    }
  });
}

export type DirectoryProfileWithFullOwner = NonNullable<Awaited<ReturnType<typeof findDirectoryProfileWithFullOwner>>>;

export type DirectoryHubFilters = {
  city?: string;
  online?: boolean;
  workFormat?: string;
  platform?: string;
  audience?: string;
  minPercent?: number;
  hasTrainer?: boolean;
  agencyInclude?: string;
  hasVacancies?: boolean;
  verifiedOnly?: boolean;
};

function directoryHubWhere(type: "STUDIO" | "AGENCY", filters: DirectoryHubFilters) {
  const now = new Date();

  return {
    type,
    status: "PUBLISHED" as const,
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.online ? { city: null } : {}),
    ...(filters.workFormat ? { workFormats: { has: filters.workFormat } } : {}),
    ...(filters.platform ? { platforms: { has: filters.platform } } : {}),
    ...(filters.audience ? { audiences: { has: filters.audience } } : {}),
    ...(filters.minPercent
      ? type === "STUDIO"
        ? { percentMin: { gte: filters.minPercent } }
        : { agencySharePercent: { lte: filters.minPercent } }
      : {}),
    ...(filters.hasTrainer ? { hasTrainer: true } : {}),
    ...(filters.agencyInclude ? { agencyIncludes: { has: filters.agencyInclude } } : {}),
    ...(filters.verifiedOnly ? { verificationStatus: "VERIFIED" as const } : {}),
    ...(filters.hasVacancies
      ? {
          owner: {
            listings: {
              some: { status: "PUBLISHED" as const, type: "VACANCY" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
            }
          }
        }
      : {})
  };
}

export async function listDirectoryProfiles(type: "STUDIO" | "AGENCY", filters: DirectoryHubFilters = {}) {
  const now = new Date();
  return prisma.directoryProfile.findMany({
    where: directoryHubWhere(type, filters),
    include: {
      owner: {
        select: {
          id: true,
          _count: {
            select: {
              listings: {
                where: { status: "PUBLISHED", type: "VACANCY", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
              }
            }
          }
        }
      },
      savedBy: true
    },
    take: 100
  });
}

export async function countDirectoryProfiles(type: "STUDIO" | "AGENCY", filters: DirectoryHubFilters = {}) {
  return prisma.directoryProfile.count({ where: directoryHubWhere(type, filters) });
}

export async function distinctDirectoryCities(type: "STUDIO" | "AGENCY") {
  const rows = await prisma.directoryProfile.findMany({
    where: { type, status: "PUBLISHED", city: { not: null } },
    select: { city: true },
    distinct: ["city"]
  });
  return rows.map((row) => row.city as string).sort((a, b) => a.localeCompare(b, "ru"));
}

export async function distinctDirectoryPlatforms(type: "STUDIO" | "AGENCY") {
  const rows = await prisma.directoryProfile.findMany({
    where: { type, status: "PUBLISHED" },
    select: { platforms: true }
  });
  return Array.from(new Set(rows.flatMap((row) => row.platforms))).sort();
}
