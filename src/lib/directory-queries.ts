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
