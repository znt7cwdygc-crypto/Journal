import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { articleSeoPath, listingSeoPath, productSeoPath, resumeSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поиск",
  description: "Поиск по материалам, авторам, вакансиям, услугам и резюме MyCamDesk.",
  robots: { index: false, follow: true }
};

function normalizeQuery(value: string | undefined) {
  return (value || "").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: { searchParams?: { q?: string } }) {
  const q = normalizeQuery(searchParams?.q);
  const session = await auth();
  const now = new Date();

  if (q) {
    prisma.searchQuery.create({ data: { query: q, userId: session?.user?.id } }).catch(() => {});
  }

  const [articles, authors, listings, resumes, products, guides] = q
    ? await Promise.all([
        prisma.article.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { summary: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } }
            ]
          },
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { profileBio: { contains: q, mode: "insensitive" } }
            ]
          },
          orderBy: { updatedAt: "desc" },
          take: 10
        }),
        prisma.listing.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ],
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { city: { contains: q, mode: "insensitive" } }
                ]
              }
            ]
          },
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        prisma.resume.findMany({
          where: {
            isPublic: true,
            hiddenByInactivity: false,
            expiresAt: { gt: now },
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { roleGoal: { contains: q, mode: "insensitive" } }
            ]
          },
          include: { user: true },
          orderBy: { updatedAt: "desc" },
          take: 10
        }),
        prisma.product.findMany({
          where: {
            status: "PUBLISHED",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            AND: [
              {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { category: { contains: q, mode: "insensitive" } },
                  { city: { contains: q, mode: "insensitive" } }
                ]
              }
            ]
          },
          select: {
            id: true,
            title: true,
            category: true,
            city: true,
            priceRub: true,
            description: true
          },
          orderBy: { createdAt: "desc" },
          take: 10
        }),
        prisma.guide.findMany({
          where: {
            isPublished: true,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { h1: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { intro: { contains: q, mode: "insensitive" } }
            ]
          },
          select: { id: true, path: true, title: true, description: true, kind: true },
          orderBy: { sortOrder: "asc" },
          take: 10
        })
      ])
    : [[], [], [], [], [], []];

  const usefulLinks = q
    ? await prisma.usefulLink.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { topic: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { title: true, url: true, topic: true, description: true },
        take: 10,
      })
    : [];

  const total = articles.length + authors.length + listings.length + resumes.length + products.length + guides.length + usefulLinks.length;

  return (
    <div className="space-y-5">
      <section className="border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="inline-flex rounded bg-mint px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Поиск
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{q ? `Результаты: ${q}` : "Поиск по ресурсу"}</h1>
        <form action="/search" className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-hot"
            placeholder="Статья, автор, услуга, город"
          />
          <button className="rounded-lg bg-hot px-4 py-2 text-sm font-medium text-white" type="submit">
            Найти
          </button>
        </form>
        {q && <p className="mt-3 text-sm text-zinc-600">Найдено: {total}</p>}
      </section>

      {!q && <p className="text-sm text-zinc-600">Введите запрос, чтобы найти материалы, авторов и размещения.</p>}
      {q && total === 0 && <p className="text-sm text-zinc-600">Ничего не найдено. Попробуйте другой запрос.</p>}

      {articles.length > 0 && (
        <SearchSection title="Статьи">
          {articles.map((article) => (
            <Link key={article.id} href={articleSeoPath(article)} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{article.createdBy.name || article.createdBy.email || "Автор"}</p>
              <h2 className="mt-1 font-semibold">{article.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{article.summary}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {authors.length > 0 && (
        <SearchSection title="Авторы">
          {authors.map((author) => (
            <Link key={author.id} href={`/profiles/${author.id}`} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <h2 className="font-semibold">{author.name || author.email || "Автор"}</h2>
              <p className="mt-1 text-sm text-zinc-600">{author.role}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {listings.length > 0 && (
        <SearchSection title="Вакансии и услуги">
          {listings.map((listing) => (
            <Link key={listing.id} href={listingSeoPath(listing)} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{listing.type === "VACANCY" ? "Вакансия" : "Услуга"} • {listing.city || "город не указан"}</p>
              <h2 className="mt-1 font-semibold">{listing.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{listing.description}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {resumes.length > 0 && (
        <SearchSection title="Резюме">
          {resumes.map((resume) => (
            <Link key={resume.id} href={resumeSeoPath(resume)} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{resume.user.name || resume.user.email || "Профиль"} • {resume.city || "город не указан"}</p>
              <h2 className="mt-1 font-semibold">{resume.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{resume.bio}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {products.length > 0 && (
        <SearchSection title="Товары">
          {products.map((product) => (
            <Link key={product.id} href={productSeoPath(product)} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{product.category} • {product.city || "город не указан"} • {new Intl.NumberFormat("ru-RU").format(product.priceRub)} ₽</p>
              <h2 className="mt-1 font-semibold">{product.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{product.description}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {guides.length > 0 && (
        <SearchSection title="Гайды">
          {guides.map((guide) => (
            <Link key={guide.id} href={guide.path} className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{guide.kind === "guide" ? "Гайд" : guide.kind === "vacancy" ? "Вакансии" : guide.kind === "service" ? "Услуги" : "Резюме"}</p>
              <h2 className="mt-1 font-semibold">{guide.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{guide.description}</p>
            </Link>
          ))}
        </SearchSection>
      )}

      {usefulLinks.length > 0 && (
        <SearchSection title="Полезные ссылки">
          {usefulLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="block border border-zinc-200 bg-white p-4 hover:border-hot">
              <p className="text-xs text-zinc-500">{link.topic}</p>
              <h2 className="mt-1 font-semibold">{link.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{link.description}</p>
            </a>
          ))}
        </SearchSection>
      )}
    </div>
  );
}

function SearchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}
