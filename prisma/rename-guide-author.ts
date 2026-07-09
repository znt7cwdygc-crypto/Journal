import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const oldName = "Марина Совина";
const newName = "Ксения Ясенева";
const newTitle = "Эксперт вебкам-индустрии — 12 лет опыта: модель, оператор, управляющая сетью студий";

async function main() {
  const result = await prisma.guide.updateMany({
    where: { authorName: oldName },
    data: { authorName: newName, authorTitle: newTitle },
  });
  console.log(`Renamed author on ${result.count} guides`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
