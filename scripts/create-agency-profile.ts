import { AccountMode, ContentStatus, EmploymentType, ListingType, PrismaClient, ProfileKind, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "agency.contentshield@example.com";
  const passwordHash = await hash("agency12345", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "ContentShield Agency",
      role: UserRole.USER,
      accountMode: AccountMode.PROVIDER,
      profileKind: ProfileKind.AGENCY,
      passwordHash,
      isAdultConfirmed: true
    },
    create: {
      email,
      name: "ContentShield Agency",
      role: UserRole.USER,
      accountMode: AccountMode.PROVIDER,
      profileKind: ProfileKind.AGENCY,
      passwordHash,
      isAdultConfirmed: true
    }
  });

  const article = await prisma.article.create({
    data: {
      title: "Как удалить персональные данные и негативные упоминания из поиска",
      slug: `content-removal-guide-${Date.now()}`,
      kind: "EXPERT",
      summary: "Пошаговый план удаления нежелательного контента и защиты репутации.",
      body: "В этой статье разбираем, как найти источники публикаций, подготовить юридически корректные запросы на удаление, подать жалобы в поисковые системы и зафиксировать результат. Отдельно описываем процесс для Telegram, форумов и агрегаторов, а также сроки обработки и типовые причины отказа.",
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      createdById: user.id
    }
  });

  await prisma.expertSlot.create({
    data: {
      articleId: article.id,
      geoCode: "remote",
      title: "ContentShield Agency",
      specialization: "Удаление контента и защита репутации",
      contact: "@contentshield_support",
      vacanciesUrl: "/vacancies",
      isRemoteFallback: true,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120)
    }
  });

  const service = await prisma.listing.create({
    data: {
      type: ListingType.SERVICE,
      title: "Удаление контента из Google/Яндекс и деиндексация ссылок",
      description: "Аудит выдачи, подготовка обращений площадкам, работа с DMCA/правом на забвение, сопровождение до результата.",
      city: "Удаленно",
      geoCode: "remote",
      employmentType: EmploymentType.REMOTE,
      contact: "@contentshield_support",
      status: ContentStatus.PUBLISHED,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      createdById: user.id
    }
  });

  const vacancy1 = await prisma.listing.create({
    data: {
      type: ListingType.VACANCY,
      title: "Юрист по digital-репутации",
      description: "Нужен юрист для подготовки претензий, уведомлений и сопровождения кейсов по удалению контента.",
      city: "Москва",
      geoCode: "moscow,ru",
      employmentType: EmploymentType.HYBRID,
      contact: "hr@contentshield.agency",
      status: ContentStatus.PUBLISHED,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      createdById: user.id
    }
  });

  const vacancy2 = await prisma.listing.create({
    data: {
      type: ListingType.VACANCY,
      title: "OSINT-аналитик по поиску копий контента",
      description: "Поиск репостов и зеркал, фиксация источников, ведение трекера удаления и отчётность по SLA.",
      city: "Санкт-Петербург",
      geoCode: "saint-petersburg,ru",
      employmentType: EmploymentType.REMOTE,
      contact: "hr@contentshield.agency",
      status: ContentStatus.PUBLISHED,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      createdById: user.id
    }
  });

  console.log(JSON.stringify({
    user: { id: user.id, email: user.email, name: user.name },
    article: { id: article.id, title: article.title },
    service: { id: service.id, title: service.title },
    vacancies: [
      { id: vacancy1.id, title: vacancy1.title },
      { id: vacancy2.id, title: vacancy2.title }
    ],
    profileUrl: `/profiles/${user.id}`
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
