import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const links = [
  { title: "SplitCam", url: "https://splitcam.com", topic: "Стриминг", description: "Бесплатная альтернатива OBS, проще в освоении, мультистриминг на несколько площадок сразу" },
  { title: "ManyCam", url: "https://manycam.com", topic: "Стриминг", description: "Платный аналог с эффектами и виртуальной камерой" },
  { title: "Lovense", url: "https://www.lovense.com", topic: "Интерактив", description: "Стандарт интерактива (Lush и др.), реакция на чаевые; там же — Lovense Connect и браузерное расширение" },
  { title: "Kiiroo", url: "https://www.kiiroo.com", topic: "Интерактив", description: "Альтернативная экосистема интерактивных устройств, поддерживается частью площадок" },
  { title: "CBHours", url: "https://www.cbhours.com", topic: "Аналитика", description: "Аналитика по Chaturbate: часы онлайна, динамика, лучшие часы для выхода" },
  { title: "Statbate", url: "https://statbate.com", topic: "Аналитика", description: "Статистика токенов и типперов в реальном времени по комнатам" },
  { title: "AllMyLinks", url: "https://allmylinks.com", topic: "Продвижение", description: "Агрегатор ссылок под adult-индустрию, не банит 18+ (в отличие от Linktree)" },
  { title: "Beacons", url: "https://beacons.ai", topic: "Продвижение", description: "Альтернатива с мини-лендингом и магазином" },
  { title: "Rulta", url: "https://rulta.com", topic: "Защита контента", description: "Автоматический поиск и удаление слитого контента" },
  { title: "BranditScan", url: "https://www.branditscan.com", topic: "Защита контента", description: "Мониторинг утечек и фейковых аккаунтов" },
  { title: "Paxum", url: "https://www.paxum.com", topic: "Выплаты", description: "Основной платёжный сервис вебкам-индустрии" },
  { title: "Skrill", url: "https://www.skrill.com", topic: "Выплаты", description: "Второй по популярности платёжный сервис" },
  { title: "WeCamgirls", url: "https://www.wecamgirls.com", topic: "Сообщество", description: "Закрытый форум только для моделей (с верификацией): разборы площадок, чёрные списки" },
  { title: "AmberCutie Forum", url: "https://www.ambercutie.com/forums", topic: "Сообщество", description: "Старейший форум индустрии, огромный архив, отвечают сотрудники площадок" },
  { title: "r/CamGirlProblems", url: "https://www.reddit.com/r/CamGirlProblems", topic: "Сообщество", description: "Реддит-комьюнити: вопросы новичков, рабочие обсуждения без рекламы" },
  { title: "DeepL", url: "https://www.deepl.com", topic: "Инструменты", description: "Переводчик для переписки с англоязычными зрителями, естественнее Google Translate" },
  { title: "Time and Date", url: "https://www.timeanddate.com", topic: "Инструменты", description: "Конвертер часовых поясов — попадать в прайм-тайм США" },
  { title: "NVIDIA Broadcast", url: "https://www.nvidia.com/broadcast", topic: "Инструменты", description: "Шумоподавление и замена фона без хромакея (нужна видеокарта RTX)" },
];

async function main() {
  const existing = await prisma.usefulLink.findMany({ select: { title: true, url: true } });
  const existingTitles = new Set(existing.map((e) => e.title.toLowerCase()));
  const existingUrls = new Set(existing.map((e) => e.url.replace(/\/$/, "").toLowerCase()));
  const maxSort = await prisma.usefulLink.aggregate({ _max: { sortOrder: true } });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 1;

  let created = 0;
  for (const link of links) {
    const dup = existingTitles.has(link.title.toLowerCase()) || existingUrls.has(link.url.replace(/\/$/, "").toLowerCase());
    if (dup) {
      console.log(`skip duplicate: ${link.title}`);
      continue;
    }
    await prisma.usefulLink.create({
      data: { ...link, isPublished: true, sortOrder: nextSort },
    });
    nextSort++;
    created++;
    console.log(`created: ${link.title}`);
  }
  console.log(`Done. Created ${created} new links.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
