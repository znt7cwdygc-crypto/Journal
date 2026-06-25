import type { Guide } from "@prisma/client";
import type { GuidePageData } from "@/components/seo-landing-page";

/** Parse a Guide DB row into the shape used by SeoLandingPage */
export function parseGuide(guide: Guide): GuidePageData {
  return {
    kind: guide.kind,
    slug: guide.slug,
    path: guide.path,
    title: guide.title,
    h1: guide.h1,
    description: guide.description,
    intro: guide.intro,
    audience: guide.audience,
    keywords: guide.keywords,
    sections: JSON.parse(guide.sections) as { title: string; body: string }[],
    faq: JSON.parse(guide.faq) as { question: string; answer: string }[],
    ctaLabel: guide.ctaLabel,
    ctaHref: guide.ctaHref,
    related: guide.related,
  };
}
