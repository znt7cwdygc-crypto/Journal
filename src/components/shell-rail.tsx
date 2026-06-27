import Link from "next/link";
import { getAdvertisementForPlacement } from "@/lib/ads";
import { prisma } from "@/lib/prisma";
import { serviceTopic } from "@/lib/topics";

type TopicItem = {
  label: string;
  href: string;
};

type QueryItem = {
  label: string;
  href: string;
  meta: string;
  score: number;
};

const topicColors = [
  "bg-red-50 text-hot hover:bg-red-100",
  "bg-yellow-50 text-amber-800 hover:bg-yellow-100",
  "bg-sky-50 text-sky-700 hover:bg-sky-100",
  "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
];

const fallbackTopics: TopicItem[] = [
  { label: "Истории", href: "/articles?topic=Истории" },
  { label: "Деньги", href: "/articles?topic=Деньги" },
  { label: "Безопасность", href: "/articles?topic=Безопасность" },
  { label: "Работа", href: "/articles?topic=Работа" }
];

function addQuery(items: QueryItem[], item: QueryItem | null) {
  if (!item) return;
  if (items.some((existing) => existing.href === item.href || existing.label === item.label)) return;
  items.push(item);
}

function structuredValue(text: string, label: string) {
  const line = text.split("\n").find((item) => item.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function serviceCategory(title: string, description: string) {
  return structuredValue(description, "Категория") || serviceTopic(title, description);
}

async function getRailData() {
  const now = new Date();
  const [
    articleTopics,
    vacancyCities,
    serviceCategories,
    productCategories,
    resumeCities,
    matchProfiles,
    popularArticles
  ] = await Promise.all([
    prisma.article.groupBy({
      by: ["topic"],
      where: { status: "PUBLISHED", topic: { not: null } },
      _count: { _all: true }
    }),
    prisma.listing.groupBy({
      by: ["city"],
      where: {
        type: "VACANCY",
        status: "PUBLISHED",
        city: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      _count: { _all: true }
    }),
    prisma.listing.findMany({
      where: {
        type: "SERVICE",
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      select: { title: true, description: true, viewCount: true, responseCount: true },
      orderBy: [{ responseCount: "desc" }, { viewCount: "desc" }],
      take: 12
    }),
    prisma.product.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      _count: { _all: true }
    }),
    prisma.resume.groupBy({
      by: ["city"],
      where: {
        isPublic: true,
        hiddenByInactivity: false,
        city: { not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      _count: { _all: true }
    }),
    prisma.matchProfile.groupBy({
      by: ["lookingFor"],
      where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      _count: { _all: true }
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { topic: true, viewCount: true, responseCount: true },
      orderBy: [{ viewCount: "desc" }, { responseCount: "desc" }],
      take: 6
    })
  ]);

  const topics = articleTopics
    .filter((item) => item.topic)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 10)
    .map((item) => ({
      label: item.topic || "Без темы",
      href: `/articles?topic=${encodeURIComponent(item.topic || "")}`
    }));

  const queries: QueryItem[] = [];

  for (const city of vacancyCities.sort((a, b) => b._count._all - a._count._all).slice(0, 3)) {
    if (!city.city) continue;
    addQuery(queries, {
      label: `Вакансии ${city.city}`,
      href: `/vacancies?city=${encodeURIComponent(city.city)}`,
      meta: `${city._count._all} объявл.`,
      score: city._count._all * 20
    });
  }

  const serviceHits = serviceCategories.reduce<Record<string, { count: number; views: number }>>((acc, item) => {
    const category = serviceCategory(item.title, item.description);
    acc[category] = acc[category] || { count: 0, views: 0 };
    acc[category].count += 1;
    acc[category].views += item.viewCount + item.responseCount * 3;
    return acc;
  }, {});

  for (const [category, stats] of Object.entries(serviceHits)) {
    addQuery(queries, {
      label: category,
      href: `/services?category=${encodeURIComponent(category)}`,
      meta: `${stats.count} услуг`,
      score: stats.views + stats.count * 10
    });
  }

  for (const category of productCategories.sort((a, b) => b._count._all - a._count._all).slice(0, 3)) {
    addQuery(queries, {
      label: `Товары: ${category.category}`,
      href: `/products?category=${encodeURIComponent(category.category)}`,
      meta: `${category._count._all} шт.`,
      score: category._count._all * 12
    });
  }

  for (const city of resumeCities.sort((a, b) => b._count._all - a._count._all).slice(0, 3)) {
    if (!city.city) continue;
    addQuery(queries, {
      label: `Резюме ${city.city}`,
      href: `/resumes?city=${encodeURIComponent(city.city)}`,
      meta: `${city._count._all} анкет`,
      score: city._count._all * 14
    });
  }

  for (const item of matchProfiles.sort((a, b) => b._count._all - a._count._all).slice(0, 2)) {
    const label = item.lookingFor === "OPERATOR" ? "Модели ищут операторов" : item.lookingFor === "MODEL" ? "Операторы ищут моделей" : "Связки модель-оператор";
    const lookingFor = item.lookingFor === "OPERATOR" ? "OPERATOR" : item.lookingFor === "MODEL" ? "MODEL" : "";
    addQuery(queries, {
      label,
      href: lookingFor ? `/model-operator?lookingFor=${lookingFor}` : "/model-operator",
      meta: `${item._count._all} анкет`,
      score: item._count._all * 16
    });
  }

  for (const article of popularArticles) {
    if (!article.topic) continue;
    addQuery(queries, {
      label: `Статьи: ${article.topic}`,
      href: `/articles?topic=${encodeURIComponent(article.topic)}`,
      meta: `${article.viewCount} просмотров`,
      score: article.viewCount + article.responseCount * 5
    });
  }

  return {
    topics: topics.length ? topics : fallbackTopics,
    queries: [...queries].sort((a, b) => b.score - a.score).slice(0, 6)
  };
}

async function SidebarAd() {
  const ad = await getAdvertisementForPlacement("sidebar");

  if (ad) {
    return (
      <a
        className="relative block overflow-hidden border border-zinc-200 bg-zinc-950 p-4 text-white transition hover:border-hot"
        href={`/ads/${ad.id}/click`}
        rel="sponsored noopener noreferrer"
        target="_blank"
      >
        {ad.imageUrl && (
          <img className="absolute inset-0 h-full w-full object-cover opacity-80" src={ad.imageUrl} alt="" loading="lazy" />
        )}
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-hot">Реклама</p>
          <h2 className="mt-3 text-xl font-semibold leading-tight">{ad.title}</h2>
          {ad.description && <p className="mt-2 text-sm leading-6 text-zinc-300">{ad.description}</p>}
        </div>
      </a>
    );
  }

  return (
    <section className="overflow-hidden border border-zinc-200 bg-zinc-950 p-4 text-white">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-hot">Реклама</p>
      <h2 className="mt-3 text-xl font-semibold leading-tight">Ваш сервис для вебкам-аудитории</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-300">
        Разместите нативный блок для моделей, операторов, студий или специалистов.
      </p>
      <Link href="/cabinet#services" className="mt-4 inline-flex rounded-lg bg-hot px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
        Разместить услугу
      </Link>
    </section>
  );
}

export async function ShellRail() {
  const { topics, queries } = await getRailData();

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 space-y-3">
        <section className="border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold">Темы</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {topics.map((topic, index) => (
              <Link
                key={topic.href}
                className={`rounded-full px-3 py-1 font-medium ${topicColors[index % topicColors.length]}`}
                href={topic.href}
              >
                {topic.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold">Популярные запросы</p>
          <div className="mt-3 space-y-2">
            {queries.map((query) => (
              <Link key={query.href} href={query.href} className="block rounded-lg border border-zinc-100 px-3 py-2 text-xs leading-5 text-zinc-700 hover:border-hot hover:text-hot">
                <span className="block font-medium text-zinc-900">{query.label}</span>
                <span className="mt-0.5 block text-zinc-500">{query.meta}</span>
              </Link>
            ))}
          </div>
        </section>

        <SidebarAd />
      </div>
    </aside>
  );
}
