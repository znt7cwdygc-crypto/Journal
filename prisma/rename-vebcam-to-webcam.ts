import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fix(value: string) {
  return value.replace(/vebcam/g, "webcam").replace(/vebkam/g, "webcam");
}

async function main() {
  const guides = await prisma.guide.findMany({ where: { kind: "guide" } });
  let guidesChanged = 0;

  for (const g of guides) {
    const newSlug = fix(g.slug);
    const newPath = fix(g.path);
    const newRelated = g.related.map(fix);
    const newCtaHref = g.ctaHref ? fix(g.ctaHref) : g.ctaHref;

    const changed =
      newSlug !== g.slug || newPath !== g.path || newCtaHref !== g.ctaHref || JSON.stringify(newRelated) !== JSON.stringify(g.related);

    if (!changed) continue;

    await prisma.guide.update({
      where: { id: g.id },
      data: { slug: newSlug, path: newPath, related: newRelated, ctaHref: newCtaHref },
    });
    guidesChanged++;
    console.log(`guide: ${g.slug} -> ${newSlug}`);
  }

  const articles = await prisma.article.findMany({ where: { slug: { contains: "vebcam" } } });
  let articlesChanged = 0;

  for (const a of articles) {
    const newSlug = fix(a.slug);
    if (newSlug === a.slug) continue;
    await prisma.article.update({ where: { id: a.id }, data: { slug: newSlug } });
    articlesChanged++;
    console.log(`article: ${a.slug} -> ${newSlug}`);
  }

  console.log(`Done. Guides changed: ${guidesChanged}, articles changed: ${articlesChanged}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
