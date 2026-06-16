import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@webcamexpert.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "admin12345";

  await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      accountMode: "PROVIDER",
      profileKind: "OTHER",
      isAdultConfirmed: true,
      passwordHash: await hash(password, 10)
    },
    create: {
      email,
      name: "Platform Admin",
      role: "ADMIN",
      accountMode: "PROVIDER",
      profileKind: "OTHER",
      isAdultConfirmed: true,
      passwordHash: await hash(password, 10)
    }
  });

  console.log(`Admin ready: ${email}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
