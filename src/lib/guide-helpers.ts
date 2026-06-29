import type { Guide } from "@prisma/client";
import type { GuidePageData } from "@/components/seo-landing-page";

export type ParsedGuide = GuidePageData & {
  category: string | null;
  quickAnswer: string | null;
  checklist: string[];
  mistakes: string[];
};

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse a Guide DB row into the shape used by guide pages */
export function parseGuide(guide: Guide): ParsedGuide {
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
    category: guide.category ?? null,
    quickAnswer: guide.quickAnswer ?? null,
    checklist: safeJsonArray(guide.checklist),
    mistakes: safeJsonArray(guide.mistakes),
  };
}
