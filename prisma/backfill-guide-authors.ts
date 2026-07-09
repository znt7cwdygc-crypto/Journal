import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const authorName = "Марина Совина";
const authorTitle = "Эксперт вебкам-индустрии — 12 лет опыта: модель, оператор, управляющая сетью студий";

async function main() {
  const result = await prisma.guide.updateMany({
    where: { kind: "guide", authorName: null },
    data: { authorName, authorTitle },
  });
  console.log(`Backfilled author on ${result.count} guides`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
