import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";
import { seoLandings } from "@/lib/seo-landings";

export const dynamic = "force-dynamic";

function line(title: string, path: string, description?: string) {
  const suffix = description ? ` - ${description.replace(/\s+/g, " ").trim()}` : "";
  return `- [${title}](${siteUrl(path).toString()})${suffix}`;
}

export async function GET() {
  const now = new Date();
  const [articles, listings] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, summary: true, topic: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 30
    }),
    prisma.listing.findMany({
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, title: true, description: true, type: true, city: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20
    })
  ]);

  const body = [
    `# ${siteName}`,
    "",
    siteDescription,
    "",
    "WebcamExpert Journal is a Russian-language UGC media and community platform about the webcam industry: personal stories, practical guides, discussions, resumes, vacancies, services, authors and trust signals.",
    "",
    "## Primary public sections",
    "",
    line("Home", "/", "live community feed and editorial entry points"),
    line("Articles", "/articles", "UGC stories, practical breakdowns and discussions"),
    line("Authors", "/authors", "public author profiles"),
    line("Vacancies", "/vacancies", "public specialist vacancies, excluding model hiring in user-generated vacancies"),
    line("Services", "/services", "public service listings and expert offers"),
    line("Resumes", "/resumes", "public resumes"),
    line("Stories", "/stories", "personal stories and editorial collection"),
    line("Money", "/money", "income, fees and finance-related materials"),
    line("Safety", "/safety", "privacy and safety guides"),
    line("Work", "/work", "work-related guides and listings"),
    "",
    "## SEO guides and landing pages",
    "",
    ...seoLandings.slice(0, 40).map((landing) => line(landing.h1, landing.path, landing.description)),
    "",
    "## Recent public articles",
    "",
    ...(articles.length
      ? articles.map((article) => line(article.title, `/articles/${article.id}`, [article.topic, article.summary].filter(Boolean).join(": ")))
      : ["- No public articles yet."]),
    "",
    "## Recent public listings",
    "",
    ...(listings.length
      ? listings.map((listing) =>
          line(
            listing.title,
            `/listings/${listing.id}`,
            [listing.type === "VACANCY" ? "Vacancy" : "Service", listing.city, listing.description.slice(0, 180)].filter(Boolean).join(": ")
          )
        )
      : ["- No public listings yet."]),
    "",
    "## Crawling notes",
    "",
    "- Private areas are not intended for indexing: /cabinet, /admin, /auth, /api.",
    "- Canonical URLs use article and listing IDs for stable MVP links.",
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
