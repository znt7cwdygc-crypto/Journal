import type { Metadata } from "next";
import Link from "next/link";
import { adminDeleteContentAction, adminEditArticleAction, adminEditListingAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Контент",
  robots: { index: false, follow: false },
};

type Tab = "articles" | "listings" | "products" | "resumes";

const tabs: { key: Tab; label: string }[] = [
  { key: "articles", label: "Статьи" },
  { key: "listings", label: "Объявления" },
  { key: "products", label: "Товары" },
  { key: "resumes", label: "Резюме" },
];

const statusOptions = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"] as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole(["ADMIN", "MODERATOR"]);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = tabs.some((t) => t.key === rawTab) ? (rawTab as Tab) : "articles";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Контент</h1>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content?tab=${t.key}`}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              t.key === tab ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "articles" && <ArticlesTab />}
      {tab === "listings" && <ListingsTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "resumes" && <ResumesTab />}
    </div>
  );
}

async function ArticlesTab() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <TreeRoot title={`Статьи (${articles.length})`}>
      {articles.map((a) => (
        <TreeBranch key={a.id} label={`${a.title} — ${a.status}`} defaultOpen={false}>
          <TreeLeaf>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Автор: {a.createdBy.name || a.createdBy.email}</span>
                <span>Статус: {a.status}</span>
                <span>Просмотры: {a.viewCount}</span>
                <span>Создана: {a.createdAt.toLocaleDateString("ru-RU")}</span>
              </div>
              <form action={adminEditArticleAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="articleId" value={a.id} />
                <div>
                  <label className="block text-xs font-medium">Заголовок</label>
                  <input name="title" defaultValue={a.title} className="mt-1 rounded border p-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium">Статус</label>
                  <select name="status" defaultValue={a.status} className="mt-1 rounded border p-1.5 text-sm">
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                  Сохранить
                </button>
              </form>
              <div className="flex gap-2">
                <form action={adminDeleteContentAction}>
                  <input type="hidden" name="contentType" value="article" />
                  <input type="hidden" name="contentId" value={a.id} />
                  <button type="submit" className="rounded bg-red-600 px-3 py-1 text-xs text-white">Скрыть/Архив</button>
                </form>
                <Link href={`/blog/${a.slug}`} className="rounded bg-zinc-200 px-3 py-1 text-xs" target="_blank">
                  Открыть
                </Link>
              </div>
            </div>
          </TreeLeaf>
        </TreeBranch>
      ))}
    </TreeRoot>
  );
}

async function ListingsTab() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <TreeRoot title={`Объявления (${listings.length})`}>
      {listings.map((l) => (
        <TreeBranch key={l.id} label={`${l.title} — ${l.status}`} defaultOpen={false}>
          <TreeLeaf>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Автор: {l.createdBy.name || l.createdBy.email}</span>
                <span>Тип: {l.type}</span>
                <span>Статус: {l.status}</span>
                <span>Просмотры: {l.viewCount}</span>
                <span>Создано: {l.createdAt.toLocaleDateString("ru-RU")}</span>
              </div>
              <form action={adminEditListingAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="listingId" value={l.id} />
                <div>
                  <label className="block text-xs font-medium">Заголовок</label>
                  <input name="title" defaultValue={l.title} className="mt-1 rounded border p-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium">Статус</label>
                  <select name="status" defaultValue={l.status} className="mt-1 rounded border p-1.5 text-sm">
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                  Сохранить
                </button>
              </form>
              <form action={adminDeleteContentAction}>
                <input type="hidden" name="contentType" value="listing" />
                <input type="hidden" name="contentId" value={l.id} />
                <button type="submit" className="rounded bg-red-600 px-3 py-1 text-xs text-white">Скрыть/Архив</button>
              </form>
            </div>
          </TreeLeaf>
        </TreeBranch>
      ))}
    </TreeRoot>
  );
}

async function ProductsTab() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <TreeRoot title={`Товары (${products.length})`}>
      {products.map((p) => (
        <TreeBranch key={p.id} label={`${p.title} — ${p.status}`} defaultOpen={false}>
          <TreeLeaf>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Автор: {p.createdBy.name || p.createdBy.email}</span>
                <span>Статус: {p.status}</span>
                <span>Цена: {p.priceRub} руб</span>
                <span>Просмотры: {p.viewCount}</span>
                <span>Создан: {p.createdAt.toLocaleDateString("ru-RU")}</span>
              </div>
              <form action={adminDeleteContentAction}>
                <input type="hidden" name="contentType" value="product" />
                <input type="hidden" name="contentId" value={p.id} />
                <button type="submit" className="rounded bg-red-600 px-3 py-1 text-xs text-white">Скрыть/Архив</button>
              </form>
            </div>
          </TreeLeaf>
        </TreeBranch>
      ))}
    </TreeRoot>
  );
}

async function ResumesTab() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <TreeRoot title={`Резюме (${resumes.length})`}>
      {resumes.map((r) => (
        <TreeBranch key={r.id} label={`${r.title} — ${r.isPublic ? "Публичное" : "Скрытое"}`} defaultOpen={false}>
          <TreeLeaf>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>Автор: {r.user.name || r.user.email}</span>
                <span>Цель: {r.roleGoal}</span>
                <span>Просмотры: {r.viewCount}</span>
                <span>Создано: {r.createdAt.toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </TreeLeaf>
        </TreeBranch>
      ))}
    </TreeRoot>
  );
}
