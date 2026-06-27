import type { Metadata } from "next";
import { Fragment } from "react";
import { AdBlock } from "@/components/ad-block";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Полезные ссылки",
  description: "Подборка полезных инструментов и ресурсов для авторов и участников MyCamDesk.",
  alternates: { canonical: "/links" }
};

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

export default function UsefulLinksPage() {
  return (
    <div className="space-y-6">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Полезные ссылки",
        "description": "Подборка полезных инструментов и ресурсов для авторов и участников MyCamDesk.",
        "url": siteUrl("/links").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Справка</p>
        <h1 className="mt-1 text-2xl font-semibold">Полезные ссылки</h1>
        <p className="mt-2 text-sm text-zinc-600">Инструменты, платформы и ресурсы для работы в вебкам-индустрии и на контент-платформах.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((item, index) => (
          <Fragment key={item.url}>
            {index === 4 && <AdBlock placement="links" variant="card" />}
            <a href={item.url} target="_blank" rel="noreferrer" className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{item.topic}</p>
              <p className="mt-1 text-base font-semibold text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.description}</p>
              <p className="mt-3 text-xs font-medium text-accent">{item.url.replace("https://", "").replace(/\/$/, "")}</p>
            </a>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
