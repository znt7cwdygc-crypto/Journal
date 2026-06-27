import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const links = [
  { title: "OBS Studio", url: "https://obsproject.com", topic: "Стриминг", description: "Бесплатная программа для стриминга и записи видео. Настройка сцен, камеры, звука и битрейта для работы на любой платформе." },
  { title: "Canva", url: "https://www.canva.com", topic: "Визуал", description: "Онлайн-редактор для создания баннеров, обложек, превью и оформления профилей. Бесплатные шаблоны и фото." },
  { title: "Notion", url: "https://www.notion.so", topic: "Планирование", description: "Удобный инструмент для ведения контент-плана, расписания смен и личных заметок. Бесплатный для личного использования." },
  { title: "Google Trends", url: "https://trends.google.com", topic: "Аналитика", description: "Показывает популярность поисковых запросов по странам и периодам. Помогает понять что ищет аудитория." },
  { title: "EFF — безопасность в сети", url: "https://www.eff.org", topic: "Безопасность", description: "Организация по защите цифровых прав. Гайды по приватности, шифрованию, защите от слежки и удалению данных из интернета." },
  { title: "Have I Been Pwned", url: "https://haveibeenpwned.com", topic: "Безопасность", description: "Проверка email и паролей на утечки. Позволяет узнать, попали ли ваши данные в публичные базы." },
  { title: "DMCA.com", url: "https://www.dmca.com", topic: "Защита контента", description: "Сервис для подачи DMCA-запросов на удаление пиратского контента из поисковиков и с сайтов." },
  { title: "Lightroom (Adobe)", url: "https://www.adobe.com/products/photoshop-lightroom.html", topic: "Фото", description: "Профессиональный редактор фотографий для обработки портфолио, ретуши и цветокоррекции." },
  { title: "Snapseed", url: "https://play.google.com/store/apps/details?id=com.niksoftware.snapseed", topic: "Фото", description: "Бесплатный мобильный фоторедактор от Google. Быстрая обработка фото для социальных сетей и профилей." },
  { title: "Chaturbate", url: "https://chaturbate.com", topic: "Платформы", description: "Одна из крупнейших вебкам-платформ с системой токенов. Большая аудитория, комиссия ~50%." },
  { title: "Stripchat", url: "https://stripchat.com", topic: "Платформы", description: "Платформа с VR-поддержкой и низким порогом входа. Комиссия 40-50%, разные форматы шоу." },
  { title: "BongaCams", url: "https://bongacams.com", topic: "Платформы", description: "Популярная платформа с большой аудиторией из Европы и России. Бонусы для новых моделей." },
  { title: "OnlyFans", url: "https://onlyfans.com", topic: "Контент-платформы", description: "Платформа подписной модели для продажи эксклюзивного контента. Комиссия 20%." },
  { title: "Fansly", url: "https://fansly.com", topic: "Контент-платформы", description: "Альтернатива OnlyFans с более гибкими настройками подписок и меньшими ограничениями контента." },
  { title: "ProtonMail", url: "https://proton.me/mail", topic: "Безопасность", description: "Защищённая почта с шифрованием. Для рабочих контактов, которые не стоит привязывать к личному Gmail." },
  { title: "NordVPN", url: "https://nordvpn.com", topic: "Безопасность", description: "VPN для защиты IP-адреса, обхода блокировок и безопасной работы в публичных сетях." },
];

async function main() {
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const existing = await prisma.usefulLink.findFirst({ where: { url: link.url } });
    if (existing) {
      console.log(`SKIP: ${link.title} (already exists)`);
      continue;
    }
    await prisma.usefulLink.create({
      data: { ...link, sortOrder: i },
    });
    console.log(`CREATED: ${link.title}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
