import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";
import { articleSeoPath, listingSeoPath, matchProfileSeoPath, productSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

function line(title: string, path: string, description?: string) {
  const suffix = description ? ` - ${description.replace(/\s+/g, " ").trim()}` : "";
  return `- [${title}](${siteUrl(path).toString()})${suffix}`;
}

export async function GET() {
  const now = new Date();
  const [articles, listings, products, matchProfiles, guides] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, summary: true, topic: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 30
    }),
    prisma.listing.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, title: true, description: true, type: true, city: true, employmentType: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, title: true, description: true, category: true, city: true, priceRub: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    }),
    prisma.matchProfile.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, title: true, seekerRole: true, lookingFor: true, city: true, experience: true, workFormat: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    }),
    prisma.guide.findMany({
      where: { isPublished: true },
      select: { h1: true, path: true, description: true },
      orderBy: { sortOrder: "asc" },
      take: 40
    })
  ]);

  const body = [
    `# ${siteName}`,
    "",
    siteDescription,
    "",
    "MyCamDesk is a Russian-language UGC media and community platform about the webcam industry: personal stories, practical guides, discussions, resumes, vacancies, services, authors and trust signals.",
    "",
    "## Primary public sections",
    "",
    line("Home", "/", "live community feed and editorial entry points"),
    line("Articles", "/articles", "UGC stories, practical breakdowns and discussions"),
    line("Authors", "/authors", "public author profiles"),
    line("Vacancies", "/vacancies", "public specialist vacancies, excluding model hiring in user-generated vacancies"),
    line("Services", "/services", "public service listings and expert offers"),
    line("Products", "/products", "public marketplace listings from community members"),
    line("Resumes", "/resumes", "public resumes"),
    line("Model Operator", "/model-operator", "public 14-day matching profiles for models and operators"),
    line("Stories", "/stories", "personal stories and editorial collection"),
    line("Money", "/money", "income, fees and finance-related materials"),
    line("Safety", "/safety", "privacy and safety guides"),
    line("Work", "/work", "work-related guides and listings"),
    "",
    "## SEO guides and landing pages",
    "",
    ...guides.map((g) => line(g.h1, g.path, g.description)),
    "",
    "## Recent public articles",
    "",
    ...(articles.length
      ? articles.map((article) => line(article.title, articleSeoPath(article), [article.topic, article.summary].filter(Boolean).join(": ")))
      : ["- No public articles yet."]),
    "",
    "## Recent public listings",
    "",
    ...(listings.length
      ? listings.map((listing) =>
          line(
            listing.title,
            listingSeoPath(listing),
            [listing.type === "VACANCY" ? "Vacancy" : "Service", listing.city, listing.description.slice(0, 180)].filter(Boolean).join(": ")
          )
        )
      : ["- No public listings yet."]),
    "",
    "## Recent public products",
    "",
    ...(products.length
      ? products.map((product) =>
          line(
            product.title,
            productSeoPath(product),
            ["Product", product.category, product.city, `${product.priceRub} RUB`, product.description.slice(0, 160)].filter(Boolean).join(": ")
          )
        )
      : ["- No public products yet."]),
    "",
    "## Recent model-operator profiles",
    "",
    ...(matchProfiles.length
      ? matchProfiles.map((profile) =>
          line(
            profile.title,
            matchProfileSeoPath(profile),
            ["Match profile", profile.seekerRole, `looking for ${profile.lookingFor}`, profile.city, profile.experience, profile.workFormat].filter(Boolean).join(": ")
          )
        )
      : ["- No public model-operator profiles yet."]),
    "",
    "## Crawling notes",
    "",
    "- Private areas are not intended for indexing: /cabinet, /admin, /auth, /api.",
    "- Canonical URLs use transliterated SEO slugs with a short stable ID suffix.",
    "- Public article pages include Schema.org Article JSON-LD.",
    "- Sitemap: " + siteUrl("/sitemap.xml").toString(),
    "- Robots: " + siteUrl("/robots.txt").toString(),
    ""
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
