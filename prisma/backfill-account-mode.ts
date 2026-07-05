import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// accountMode больше не выбирается пользователем — приводим его в соответствие с ролью.
// Модель и оператор -> CONSUMER, все остальные роли -> PROVIDER.
async function main() {
  const toProvider = await prisma.user.updateMany({
    where: { profileKind: { notIn: ["MODEL", "OPERATOR"] }, accountMode: { not: "PROVIDER" } },
    data: { accountMode: "PROVIDER" },
  });

  const toConsumer = await prisma.user.updateMany({
    where: { profileKind: { in: ["MODEL", "OPERATOR"] }, accountMode: { not: "CONSUMER" } },
    data: { accountMode: "CONSUMER" },
  });

  console.log(`Set PROVIDER: ${toProvider.count}, set CONSUMER: ${toConsumer.count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
