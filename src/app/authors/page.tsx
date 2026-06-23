import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { Prisma, ProfileKind } from "@prisma/client";
import { AdBlock } from "@/components/ad-block";
import { SafeImage } from "@/components/safe-image";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Авторы",
  description: "Авторы, студии, эксперты и участники сообщества WebcamExpert с опубликованными материалами и профилями.",
  alternates: { canonical: "/authors" },
  openGraph: {
    title: "Авторы WebcamExpert",
    description: "Люди и команды сообщества: статьи, услуги, вакансии и резюме.",
    url: "/authors"
  }
};

const kindFilters: Array<{ key: "ALL" | ProfileKind; label: string }> = [
  { key: "ALL", label: "Все" },
  { key: "MODEL", label: "Модели" },
  { key: "STUDIO", label: "Студии" },
  { key: "EXPERT", label: "Эксперты" },
  { key: "OPERATOR", label: "Операторы" },
  { key: "LAWYER", label: "Юристы" }
];

const sortFilters = [
  { key: "new", label: "Новые" },
  { key: "popular", label: "Популярные" },
  { key: "useful", label: "Самые полезные" }
];

export default async function AuthorsPage({ searchParams }: { searchParams?: { kind?: string; sort?: string } }) {
  const activeKind = kindFilters.some((filter) => filter.key === searchParams?.kind) ? searchParams?.kind || "ALL" : "ALL";
  const activeSort = sortFilters.some((filter) => filter.key === searchParams?.sort) ? searchParams?.sort || "new" : "new";
  const now = new Date();

  const where: Prisma.UserWhereInput = {
    AND: [
      activeKind === "ALL" ? {} : { profileKind: activeKind as ProfileKind },
      {
        OR: [
          { articles: { some: { status: "PUBLISHED" } } },
          { listings: { some: { status: "PUBLISHED" } } },
          { resume: { is: { isPublic: true, hiddenByInactivity: false, expiresAt: { gt: now } } } }
        ]
      }
    ]
  };

  const authors = await prisma.user.findMany({
    where,
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        include: { ratings: true, comments: true }
      },
      _count: {
        select: {
          articles: { where: { status: "PUBLISHED" } },
          listings: { where: { status: "PUBLISHED" } },
          authorFollowers: true
        }
      },
      resume: true
    },
    orderBy: { updatedAt: "desc" },
    take: 60
  });

  const sortedAuthors = [...authors].sort((a, b) => {
    const aUseful = a.articles.reduce((sum, article) => sum + article.ratings.filter((rating) => rating.value >= 4).length, 0);
    const bUseful = b.articles.reduce((sum, article) => sum + article.ratings.filter((rating) => rating.value >= 4).length, 0);
    const aPopular = a._count.articles * 3 + a._count.listings * 2 + aUseful;
    const bPopular = b._count.articles * 3 + b._count.listings * 2 + bUseful;
    if (activeSort === "useful") return bUseful - aUseful;
    if (activeSort === "popular") return bPopular - aPopular;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return (
    <div className="space-y-5">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Авторы",
        "url": siteUrl("/authors").toString(),
        "isPartOf": { "@type": "WebSite", "name": "WebcamExpert Journal", "url": siteUrl("/").toString() }
      }) }} />
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="inline-flex rounded bg-mint px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Авторы
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Люди и команды сообщества</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Здесь собраны авторы статей, студии, эксперты и участники с публичными резюме. Из карточки можно перейти в
          профиль и посмотреть материалы, вакансии, услуги или резюме.
        </p>
      </section>

      <section className="border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {kindFilters.map((filter) => {
            const params = new URLSearchParams();
            if (filter.key !== "ALL") params.set("kind", filter.key);
            if (activeSort !== "new") params.set("sort", activeSort);
            const active = activeKind === filter.key;
            return (
              <Link key={filter.key} href={params.toString() ? `/authors?${params.toString()}` : "/authors"} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-hot text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>
                {filter.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sortFilters.map((filter) => {
            const params = new URLSearchParams();
            if (activeKind !== "ALL") params.set("kind", activeKind);
            params.set("sort", filter.key);
            const active = activeSort === filter.key;
            return (
              <Link key={filter.key} href={`/authors?${params.toString()}`} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-ink text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}>
                {filter.label}
              </Link>
            );
          })}
        </div>
      </section>

      {sortedAuthors.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
          Пока нет авторов с опубликованными материалами.
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {sortedAuthors.map((author, index) => {
          const articles = author._count.articles;
          const listings = author._count.listings;
          const hasResume = Boolean(author.resume);
          const useful = author.articles.reduce((sum, article) => sum + article.ratings.filter((rating) => rating.value >= 4).length, 0);
          const roleLabel = author.role === "ADMIN" ? "Администратор" : author.accountMode === "PROVIDER" ? "Поставщик" : author.accountMode === "BOTH" ? "Ищет и предлагает" : "Участник";
          const verified = author.role === "ADMIN" || useful >= 5 || author._count.authorFollowers >= 3;
          const activeAuthor = articles >= 3;
          const authorImage = safeImageUrl(author.image);

          return (
            <Fragment key={author.id}>
              {index === 1 && <AdBlock placement="authors" variant="card" />}
              <Link href={`/profiles/${author.id}`} className="block min-w-0 overflow-hidden border border-zinc-200 bg-white p-5 shadow-sm hover:border-hot">
                <div className="flex min-w-0 items-start gap-3">
                  {authorImage ? (
                    <SafeImage
                      className="h-11 w-11 shrink-0 rounded object-cover"
                      src={authorImage}
                      alt={author.name || "Аватар автора"}
                      fallback={
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-hot text-base font-black text-white">
                          {(author.name || author.email || "A").slice(0, 1).toUpperCase()}
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-hot text-base font-black text-white">
                      {(author.name || author.email || "A").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="max-w-full truncate text-lg font-semibold">{author.name || author.email || "Автор"}</h2>
                    <p className="mt-1 max-w-full truncate text-sm text-zinc-600">{roleLabel} • {author.profileKind}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      {verified && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">проверенный</span>}
                      {activeAuthor && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">активный автор</span>}
                    </div>
                  </div>
                </div>
                {author.profileBio && <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">{author.profileBio}</p>}
                <div className="mt-4 flex min-w-0 flex-wrap gap-2 text-xs">
                  <span className="max-w-full truncate rounded-full bg-red-50 px-3 py-1 text-hot">{articles} статей</span>
                  <span className="max-w-full truncate rounded-full bg-sky-50 px-3 py-1 text-sky-700">{listings} размещений</span>
                  <span className="max-w-full truncate rounded-full bg-yellow-50 px-3 py-1 text-amber-800">{useful} полезных реакций</span>
                  <span className="max-w-full truncate rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{author._count.authorFollowers} подписчиков</span>
                  {hasResume && <span className="max-w-full truncate rounded-full bg-teal-50 px-3 py-1 text-accent">резюме</span>}
                </div>
              </Link>
            </Fragment>
          );
        })}
      </section>
    </div>
  );
}
