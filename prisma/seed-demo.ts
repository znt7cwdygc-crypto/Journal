import { AccountMode, ContentStatus, EmploymentType, ListingType, PaymentStatus, PaymentType, PrismaClient, ProfileKind, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function getUser(
  email: string,
  role: UserRole,
  name: string,
  password = "demo12345",
  accountMode: AccountMode = AccountMode.CONSUMER,
  profileKind: ProfileKind = ProfileKind.MODEL
) {
  return prisma.user.upsert({
    where: { email },
    update: { role, name, accountMode, profileKind, isAdultConfirmed: true, passwordHash: await hash(password, 10) },
    create: { email, role, name, accountMode, profileKind, isAdultConfirmed: true, passwordHash: await hash(password, 10) }
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@webcamexpert.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  const admin = await getUser(adminEmail, UserRole.ADMIN, "Platform Admin", adminPassword, AccountMode.PROVIDER, ProfileKind.OTHER);
  const studio1 = await getUser("studio1@demo.local", UserRole.USER, "Studio North", "demo12345", AccountMode.PROVIDER, ProfileKind.STUDIO);
  const studio2 = await getUser("studio2@demo.local", UserRole.USER, "Studio Wave", "demo12345", AccountMode.PROVIDER, ProfileKind.STUDIO);
  const expert1 = await getUser("expert1@demo.local", UserRole.USER, "Coach Vera", "demo12345", AccountMode.PROVIDER, ProfileKind.EXPERT);
  const model1 = await getUser("model1@demo.local", UserRole.USER, "Alina", "demo12345", AccountMode.CONSUMER, ProfileKind.MODEL);
  const model2 = await getUser("model2@demo.local", UserRole.USER, "Sofia", "demo12345", AccountMode.CONSUMER, ProfileKind.MODEL);
  const model3 = await getUser("model3@demo.local", UserRole.USER, "Mia", "demo12345", AccountMode.CONSUMER, ProfileKind.OPERATOR);

  await prisma.expertSlot.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.resumeContactUnlock.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.resume.deleteMany({});

  const now = new Date();
  const plusMonths4 = new Date(now);
  plusMonths4.setMonth(plusMonths4.getMonth() + 4);
  const plus30 = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const plus7 = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const a1 = await prisma.article.create({
    data: {
      title: "Как выбрать студию и не ошибиться",
      slug: `how-choose-studio-${Date.now()}-1`,
      kind: "EXPERT",
      summary: "Практический чек-лист для новичков.",
      body: "Проверьте договор, график, прозрачность выплат и поддержку команды.",
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      createdById: expert1.id
    }
  });

  const a2 = await prisma.article.create({
    data: {
      title: "7 ошибок на старте вебкам-карьеры",
      slug: `7-start-errors-${Date.now()}-2`,
      kind: "EXPERT",
      summary: "Типичные ошибки и как их избежать.",
      body: "Не игнорируйте свет, режим сна, безопасность и границы общения.",
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      createdById: studio1.id
    }
  });

  const a3 = await prisma.article.create({
    data: {
      title: "Контент-план на первую неделю",
      slug: `content-plan-week-${Date.now()}-3`,
      kind: "EXPERT",
      summary: "Шаблон стартового плана эфиров.",
      body: "Планируйте темы, время, оформление профиля и цели по KPI.",
      status: ContentStatus.PUBLISHED,
      publishedAt: now,
      createdById: studio2.id
    }
  });

  await prisma.expertSlot.createMany({
    data: [
      {
        articleId: a1.id,
        geoCode: "moscow,ru",
        title: "Studio North",
        specialization: "Онбординг моделей",
        contact: "@studio_north_hr",
        vacanciesUrl: "/vacancies",
        isRemoteFallback: false,
        startsAt: now,
        expiresAt: plusMonths4
      },
      {
        articleId: a1.id,
        geoCode: "remote",
        title: "Coach Vera",
        specialization: "Индивидуальный коучинг",
        contact: "@coach_vera",
        vacanciesUrl: "/services",
        isRemoteFallback: true,
        startsAt: now,
        expiresAt: plusMonths4
      },
      {
        articleId: a2.id,
        geoCode: "saint petersburg,ru",
        title: "Studio Wave",
        specialization: "Рост дохода и дисциплина",
        contact: "hr@studiowave.example",
        vacanciesUrl: "/vacancies",
        isRemoteFallback: false,
        startsAt: now,
        expiresAt: plusMonths4
      },
      {
        articleId: a3.id,
        geoCode: "remote",
        title: "Studio Wave Remote",
        specialization: "Удаленный старт",
        contact: "@wave_remote",
        vacanciesUrl: "/vacancies",
        isRemoteFallback: true,
        startsAt: now,
        expiresAt: plusMonths4
      }
    ]
  });

  await prisma.listing.createMany({
    data: [
      {
        type: ListingType.VACANCY,
        title: "Оператор чата (удаленно)",
        description: "Смена 6 часов, обучение за счет студии.",
        city: "Москва",
        geoCode: "moscow,ru",
        employmentType: EmploymentType.REMOTE,
        contact: "@north_jobs",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: studio1.id
      },
      {
        type: ListingType.VACANCY,
        title: "Администратор студии",
        description: "Офис, опыт от 1 года, KPI бонусы.",
        city: "Санкт-Петербург",
        geoCode: "saint petersburg,ru",
        employmentType: EmploymentType.OFFICE,
        contact: "hr@studiowave.example",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: studio2.id
      },
      {
        type: ListingType.VACANCY,
        title: "Трафик-менеджер",
        description: "Гибрид, ставка + %. Работа с аналитикой.",
        city: "Казань",
        geoCode: "kazan,ru",
        employmentType: EmploymentType.HYBRID,
        contact: "@studio_wave_jobs",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: studio2.id
      },
      {
        type: ListingType.SERVICE,
        title: "Коучинг по росту дохода",
        description: "4-недельная программа и персональный разбор.",
        city: "Удаленно",
        geoCode: "remote",
        employmentType: EmploymentType.REMOTE,
        contact: "@coach_vera",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: expert1.id
      },
      {
        type: ListingType.SERVICE,
        title: "Настройка света и OBS",
        description: "Технический аудит и готовые пресеты.",
        city: "Удаленно",
        geoCode: "remote",
        employmentType: EmploymentType.REMOTE,
        contact: "setup@streamgear.example",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: expert1.id
      },
      {
        type: ListingType.SERVICE,
        title: "Упаковка резюме для студий",
        description: "Сильная самопрезентация и корректировка профиля.",
        city: "Минск",
        geoCode: "minsk,by",
        employmentType: EmploymentType.REMOTE,
        contact: "@resume_pro",
        status: ContentStatus.PUBLISHED,
        expiresAt: plus30,
        createdById: studio1.id
      }
    ]
  });

  const r1 = await prisma.resume.create({
    data: {
      userId: model1.id,
      title: "Модель-новичок, готова к обучению",
      bio: "Коммуникабельная, стабильный график, быстро учусь.",
      city: "Москва",
      roleGoal: "Модель",
      experienceMonths: 3,
      contactEmail: "model1@demo.local",
      contactTelegram: "@model_alina",
      hiddenByInactivity: false,
      isPublic: true,
      lastVisitedAt: now,
      expiresAt: plus7
    }
  });

  const r2 = await prisma.resume.create({
    data: {
      userId: model2.id,
      title: "Оператор с опытом модерации",
      bio: "Опыт ведения нескольких аккаунтов, работа с KPI.",
      city: "Санкт-Петербург",
      roleGoal: "Оператор",
      experienceMonths: 14,
      contactEmail: "model2@demo.local",
      contactTelegram: "@sofia_ops",
      hiddenByInactivity: false,
      isPublic: true,
      lastVisitedAt: now,
      expiresAt: plus7
    }
  });

  const r3 = await prisma.resume.create({
    data: {
      userId: model3.id,
      title: "Админ студии / саппорт",
      bio: "Организую процессы, веду расписание и onboarding.",
      city: "Екатеринбург",
      roleGoal: "Администратор",
      experienceMonths: 20,
      contactEmail: "model3@demo.local",
      contactTelegram: "@mia_admin",
      hiddenByInactivity: false,
      isPublic: true,
      lastVisitedAt: now,
      expiresAt: plus7
    }
  });

  const unlockExp = new Date(now.getTime() + 1000 * 60 * 60 * 24);
  await prisma.resumeContactUnlock.createMany({
    data: [
      { resumeId: r1.id, studioId: studio1.id, unlockedAt: now, expiresAt: unlockExp },
      { resumeId: r2.id, studioId: studio2.id, unlockedAt: now, expiresAt: unlockExp }
    ]
  });

  await prisma.payment.createMany({
    data: [
      { payerId: studio1.id, type: PaymentType.ARTICLE_SLOT, amountUsd: 50, txHash: "TX-DEMO-001", receiptImageUrl: "https://example.com/receipt1.png", status: PaymentStatus.VERIFIED, referenceType: "article", referenceId: a1.id, reviewedById: admin.id, reviewedAt: now },
      { payerId: studio2.id, type: PaymentType.VACANCY_PUBLICATION, amountUsd: 70, txHash: "TX-DEMO-002", receiptImageUrl: "https://example.com/receipt2.png", status: PaymentStatus.VERIFIED, referenceType: "listing", referenceId: (await prisma.listing.findFirstOrThrow({ where: { title: "Администратор студии" } })).id, reviewedById: admin.id, reviewedAt: now },
      { payerId: expert1.id, type: PaymentType.SERVICE_PUBLICATION, amountUsd: 50, txHash: "TX-DEMO-003", receiptImageUrl: "https://example.com/receipt3.png", status: PaymentStatus.PENDING, referenceType: "listing", referenceId: (await prisma.listing.findFirstOrThrow({ where: { title: "Настройка света и OBS" } })).id },
      { payerId: studio1.id, type: PaymentType.RESUME_UNLOCK, amountUsd: 10, txHash: "TX-DEMO-004", receiptImageUrl: "https://example.com/receipt4.png", status: PaymentStatus.VERIFIED, referenceType: "resume_unlock", referenceId: r1.id, reviewedById: admin.id, reviewedAt: now }
    ]
  });

  const counts = {
    articles: await prisma.article.count({ where: { status: ContentStatus.PUBLISHED } }),
    vacancies: await prisma.listing.count({ where: { type: ListingType.VACANCY, status: ContentStatus.PUBLISHED } }),
    services: await prisma.listing.count({ where: { type: ListingType.SERVICE, status: ContentStatus.PUBLISHED } }),
    resumes: await prisma.resume.count({ where: { isPublic: true, hiddenByInactivity: false, expiresAt: { gt: now } } })
  };

  console.log("Demo seeded:", counts);
  console.log("Demo users password: demo12345");
}

main().finally(async () => {
  await prisma.$disconnect();
});
