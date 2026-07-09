import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const targets: { kind: string; slug: string }[] = [
  { kind: "service", slug: "obs" },
  { kind: "service", slug: "legal" },
  { kind: "service", slug: "security" },
  { kind: "service", slug: "coaching" },
  { kind: "vacancy", slug: "webcam-model" },
  { kind: "vacancy", slug: "operator" },
  { kind: "vacancy", slug: "remote" },
  { kind: "resume", slug: "models" },
  { kind: "resume", slug: "operators" },
];

async function main() {
  let count = 0;
  for (const { kind, slug } of targets) {
    const result = await prisma.guide.updateMany({
      where: { kind, slug },
      data: { isPublished: false },
    });
    count += result.count;
  }
  console.log(`Unpublished ${count} thin hub pages (now 404 -> 301 via next.config redirects)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
