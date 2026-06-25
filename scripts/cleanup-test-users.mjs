// One-time script to delete test/QA accounts from production
// Run: DATABASE_URL="..." node scripts/cleanup-test-users.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PATTERNS = [
  "example.local",
  "example.com",
  "demo.local",
  "test.local",
  "@test.com",
  "@gmmx.ri",
];

const KEEP_EMAILS = ["admin@webcamexpert.local"];

async function main() {
  const allUsers = await prisma.user.findMany({
    where: {
      email: { not: null },
    },
    select: { id: true, email: true },
  });

  const toDelete = allUsers.filter((u) => {
    if (!u.email) return false;
    if (KEEP_EMAILS.includes(u.email)) return false;
    return TEST_PATTERNS.some((p) => u.email.includes(p));
  });

  if (toDelete.length === 0) {
    console.log("No test users found.");
    return;
  }

  console.log(`Found ${toDelete.length} test user(s) to delete:`);
  for (const u of toDelete) console.log(`  - ${u.email} (${u.id})`);

  const ids = toDelete.map((u) => u.id);

  // Delete relations that don't have onDelete: Cascade from User
  const delArticles = await prisma.article.deleteMany({ where: { createdById: { in: ids } } });
  console.log(`Deleted ${delArticles.count} articles`);

  const delListings = await prisma.listing.deleteMany({ where: { createdById: { in: ids } } });
  console.log(`Deleted ${delListings.count} listings`);

  const delResumes = await prisma.resume.deleteMany({ where: { userId: { in: ids } } });
  console.log(`Deleted ${delResumes.count} resumes`);

  // Clear reviewedBy references on reports (nullable FK)
  await prisma.report.updateMany({ where: { reviewedById: { in: ids } }, data: { reviewedById: null } });

  // Delete payments (no cascade from User)
  const delPayments = await prisma.payment.deleteMany({ where: { payerId: { in: ids } } });
  console.log(`Deleted ${delPayments.count} payments`);

  // Now delete the users (cascade handles the rest)
  const delUsers = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${delUsers.count} users`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
