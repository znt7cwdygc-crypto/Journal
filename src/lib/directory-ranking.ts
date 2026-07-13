import { prisma } from "@/lib/prisma";

const USEFUL_ARTICLE_WINDOW_DAYS = 180;
const USEFUL_ARTICLE_CAP = 5;

export async function usefulArticleCounts(ownerIds: string[]): Promise<Map<string, number>> {
  if (ownerIds.length === 0) return new Map();

  const since = new Date(Date.now() - USEFUL_ARTICLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.article.groupBy({
    by: ["createdById"],
    where: {
      createdById: { in: ownerIds },
      status: "PUBLISHED",
      isCatalogUseful: true,
      catalogUsefulAt: { gte: since }
    },
    _count: { _all: true }
  });

  return new Map(rows.map((row) => [row.createdById, Math.min(row._count._all, USEFUL_ARTICLE_CAP)]));
}

/** Deterministic per-day hash, stable within a calendar day, changes at midnight (UTC). */
function dailyRotationKey(id: string) {
  const day = new Date().toISOString().slice(0, 10);
  const input = `${id}:${day}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

type RankableProfile = {
  id: string;
  ownerId: string;
  verificationStatus: string;
  profileCompleteness: number;
  lastDataConfirmedAt: Date | null;
};

/** Order per docs/STUDIO_CATALOG_SPEC.md §14.4 (free-tier group; no promotion yet, see §14.3). */
export function rankDirectoryProfiles<T extends RankableProfile>(profiles: T[], usefulCounts: Map<string, number>): T[] {
  return [...profiles].sort((a, b) => {
    const verifiedDiff = Number(b.verificationStatus === "VERIFIED") - Number(a.verificationStatus === "VERIFIED");
    if (verifiedDiff !== 0) return verifiedDiff;

    const usefulDiff = (usefulCounts.get(b.ownerId) || 0) - (usefulCounts.get(a.ownerId) || 0);
    if (usefulDiff !== 0) return usefulDiff;

    const completenessDiff = b.profileCompleteness - a.profileCompleteness;
    if (completenessDiff !== 0) return completenessDiff;

    const aConfirmed = a.lastDataConfirmedAt?.getTime() ?? 0;
    const bConfirmed = b.lastDataConfirmedAt?.getTime() ?? 0;
    if (aConfirmed !== bConfirmed) return bConfirmed - aConfirmed;

    return dailyRotationKey(a.id) - dailyRotationKey(b.id);
  });
}
