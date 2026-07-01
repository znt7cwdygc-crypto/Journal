import Link from "next/link";
import { getAdvertisementForPlacement } from "@/lib/ads";
import { prisma } from "@/lib/prisma";


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

const blockedQueries = new Set(["test", "тест", "секс", "sex", "порно", "porn"]);

function isBlockedQuery(label: string) {
  return blockedQueries.has(label.trim().toLowerCase());
}

function addQuery(items: QueryItem[], item: QueryItem | null) {
  if (!item) return;
  if (isBlockedQuery(item.label)) return;
  if (items.some((existing) => existing.href === item.href || existing.label === item.label)) return;
  items.push(item);
}


async function getRailData() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [articleTopics, topSearches, topViewed] = await Promise.all([
    prisma.article.groupBy({
      by: ["topic"],
      where: { status: "PUBLISHED", topic: { not: null } },
      _count: { _all: true }
    }),
    prisma.searchQuery.groupBy({
      by: ["query"],
      where: { createdAt: { gte: weekAgo } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 5
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, viewCount: true, topic: true },
      orderBy: { viewCount: "desc" },
      take: 5
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

  for (const search of topSearches) {
    addQuery(queries, {
      label: search.query,
      href: `/search?q=${encodeURIComponent(search.query)}`,
      meta: `${search._count.query} поисков`,
      score: search._count.query * 100
    });
  }

  for (const article of topViewed) {
    addQuery(queries, {
      label: article.title.length > 40 ? article.title.slice(0, 40) + "…" : article.title,
      href: `/articles?topic=${encodeURIComponent(article.topic || "")}`,
      meta: `${article.viewCount} просмотров`,
      score: article.viewCount
    });
  }

  return {
    topics: topics.length ? topics : fallbackTopics,
    queries: [...queries].sort((a, b) => b.score - a.score).slice(0, 4)
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
