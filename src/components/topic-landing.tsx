import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { articleSeoPath } from "@/lib/seo-url";

export async function TopicLanding({ topic, title, description }: { topic: string; title: string; description: string }) {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", OR: [{ topic }, { title: { contains: topic, mode: "insensitive" } }, { summary: { contains: topic, mode: "insensitive" } }] },
    include: { createdBy: true, ratings: true, comments: true },
    orderBy: { publishedAt: "desc" },
    take: 12
  });

  return (
    <div className="space-y-5">
      <section className="bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-hot">{topic}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg bg-hot px-4 py-2 font-semibold text-white" href="/cabinet">Написать историю</Link>
          <Link className="rounded-lg bg-zinc-100 px-4 py-2 font-semibold text-zinc-700" href={`/articles?topic=${encodeURIComponent(topic)}`}>Открыть ленту рубрики</Link>
        </div>
      </section>
      <section className="grid gap-3">
        {articles.map((article) => (
          <Link key={article.id} href={articleSeoPath(article)} className="block bg-white p-5 shadow-sm hover:shadow-md">
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="rounded-full bg-hot px-2.5 py-1 font-semibold text-white">{article.topic || topic}</span>
              <span>{article.createdBy.name || article.createdBy.email || "Автор"}</span>
              <span>{article.comments.length} комментариев</span>
              <span>{article.ratings.filter((rating) => rating.value >= 4).length} полезных</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold leading-tight">{article.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{article.summary}</p>
          </Link>
        ))}
        {articles.length === 0 && <div className="bg-white p-5 text-sm text-zinc-600">В рубрике пока нет материалов.</div>}
      </section>
    </div>
  );
}
