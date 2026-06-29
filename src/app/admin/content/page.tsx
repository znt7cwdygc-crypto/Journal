import type { Metadata } from "next";
import Link from "next/link";
import {
  adminDeleteContentAction,
  adminEditArticleAction,
  adminEditListingAction,
  adminEditMatchProfileAction,
  adminEditProductAction,
  adminEditResumeAction,
} from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Table, statusColor } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Контент",
  robots: { index: false, follow: false },
};

type Tab = "articles" | "listings" | "products" | "resumes" | "matches";

const tabs: { key: Tab; label: string }[] = [
  { key: "articles", label: "Статьи" },
  { key: "listings", label: "Вакансии/Услуги" },
  { key: "products", label: "Товары" },
  { key: "resumes", label: "Резюме" },
  { key: "matches", label: "Модель-оператор" },
];

const statusOptions = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"] as const;

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole(["ADMIN", "MODERATOR"]);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = tabs.some((t) => t.key === rawTab) ? (rawTab as Tab) : "articles";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Контент</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/content?tab=${t.key}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              t.key === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
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
      {tab === "matches" && <MatchesTab />}
    </div>
  );
}

function EditRow({
  action,
  idField,
  id,
  title,
  status,
}: {
  action: (formData: FormData) => void | Promise<void>;
  idField: string;
  id: string;
  title: string;
  status: string;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-medium text-blue-600">Ред.</summary>
      <form action={action} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-2">
        <input type="hidden" name={idField} value={id} />
        <div>
          <label className="block text-xs font-medium text-zinc-500">Заголовок</label>
          <input name="title" defaultValue={title} className="mt-1 rounded border border-zinc-300 p-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Статус</label>
          <select name="status" defaultValue={status} className="mt-1 rounded border border-zinc-300 p-1.5 text-sm">
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Сохранить</button>
      </form>
    </details>
  );
}

function HideBtn({ contentType, id }: { contentType: string; id: string }) {
  return (
    <form action={adminDeleteContentAction}>
      <input type="hidden" name="targetType" value={contentType} />
      <input type="hidden" name="targetId" value={id} />
      <button type="submit" className="rounded bg-red-600 px-2 py-1 text-xs text-white">Скрыть</button>
    </form>
  );
}

function ResumeEditRow({
  id,
  title,
  roleGoal,
  isPublic,
}: {
  id: string;
  title: string;
  roleGoal: string;
  isPublic: boolean;
}) {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-medium text-blue-600">Ред.</summary>
      <form action={adminEditResumeAction} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-2">
        <input type="hidden" name="resumeId" value={id} />
        <div>
          <label className="block text-xs font-medium text-zinc-500">Заголовок</label>
          <input name="title" defaultValue={title} className="mt-1 rounded border border-zinc-300 p-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Цель</label>
          <input name="roleGoal" defaultValue={roleGoal} className="mt-1 rounded border border-zinc-300 p-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">Публичность</label>
          <select name="isPublic" defaultValue={isPublic ? "true" : "false"} className="mt-1 rounded border border-zinc-300 p-1.5 text-sm">
            <option value="true">Публичное</option>
            <option value="false">Скрытое</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Сохранить</button>
      </form>
    </details>
  );
}

async function ArticlesTab() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <Table head={
      <tr>
        <th className="px-4 py-2">Заголовок</th>
        <th className="px-4 py-2">Автор</th>
        <th className="px-4 py-2">Статус</th>
        <th className="px-4 py-2">Просм.</th>
        <th className="px-4 py-2">Дата</th>
        <th className="px-4 py-2">Действия</th>
      </tr>
    }>
      {articles.map((a) => (
        <tr key={a.id} className="even:bg-zinc-50 align-top">
          <td className="px-4 py-2 font-medium text-zinc-900">{a.title}</td>
          <td className="px-4 py-2 text-zinc-500">{a.createdBy.name || a.createdBy.email}</td>
          <td className="px-4 py-2"><Badge color={statusColor(a.status)}>{a.status}</Badge></td>
          <td className="px-4 py-2 text-zinc-500">{a.viewCount}</td>
          <td className="px-4 py-2 text-zinc-400">{a.createdAt.toLocaleDateString("ru-RU")}</td>
          <td className="px-4 py-2">
            <div className="flex flex-col gap-1">
              <EditRow action={adminEditArticleAction} idField="articleId" id={a.id} title={a.title} status={a.status} />
              <div className="flex gap-2">
                <HideBtn contentType="ARTICLE" id={a.id} />
                <Link href={`/blog/${a.slug}`} className="rounded bg-zinc-200 px-2 py-1 text-xs" target="_blank">Открыть</Link>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function ListingsTab() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <Table head={
      <tr>
        <th className="px-4 py-2">Заголовок</th>
        <th className="px-4 py-2">Автор</th>
        <th className="px-4 py-2">Тип</th>
        <th className="px-4 py-2">Статус</th>
        <th className="px-4 py-2">Просм.</th>
        <th className="px-4 py-2">Дата</th>
        <th className="px-4 py-2">Действия</th>
      </tr>
    }>
      {listings.map((l) => (
        <tr key={l.id} className="even:bg-zinc-50 align-top">
          <td className="px-4 py-2 font-medium text-zinc-900">{l.title}</td>
          <td className="px-4 py-2 text-zinc-500">{l.createdBy.name || l.createdBy.email}</td>
          <td className="px-4 py-2 text-zinc-500">{l.type}</td>
          <td className="px-4 py-2"><Badge color={statusColor(l.status)}>{l.status}</Badge></td>
          <td className="px-4 py-2 text-zinc-500">{l.viewCount}</td>
          <td className="px-4 py-2 text-zinc-400">{l.createdAt.toLocaleDateString("ru-RU")}</td>
          <td className="px-4 py-2">
            <div className="flex flex-col gap-1">
              <EditRow action={adminEditListingAction} idField="listingId" id={l.id} title={l.title} status={l.status} />
              <HideBtn contentType="LISTING" id={l.id} />
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function ProductsTab() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <Table head={
      <tr>
        <th className="px-4 py-2">Заголовок</th>
        <th className="px-4 py-2">Автор</th>
        <th className="px-4 py-2">Статус</th>
        <th className="px-4 py-2">Цена</th>
        <th className="px-4 py-2">Просм.</th>
        <th className="px-4 py-2">Дата</th>
        <th className="px-4 py-2">Действия</th>
      </tr>
    }>
      {products.map((p) => (
        <tr key={p.id} className="even:bg-zinc-50">
          <td className="px-4 py-2 font-medium text-zinc-900">{p.title}</td>
          <td className="px-4 py-2 text-zinc-500">{p.createdBy.name || p.createdBy.email}</td>
          <td className="px-4 py-2"><Badge color={statusColor(p.status)}>{p.status}</Badge></td>
          <td className="px-4 py-2 text-zinc-500">{p.priceRub} руб</td>
          <td className="px-4 py-2 text-zinc-500">{p.viewCount}</td>
          <td className="px-4 py-2 text-zinc-400">{p.createdAt.toLocaleDateString("ru-RU")}</td>
          <td className="px-4 py-2">
            <div className="flex flex-col gap-1">
              <EditRow action={adminEditProductAction} idField="productId" id={p.id} title={p.title} status={p.status} />
              <HideBtn contentType="PRODUCT" id={p.id} />
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function ResumesTab() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <Table head={
      <tr>
        <th className="px-4 py-2">Заголовок</th>
        <th className="px-4 py-2">Автор</th>
        <th className="px-4 py-2">Цель</th>
        <th className="px-4 py-2">Статус</th>
        <th className="px-4 py-2">Просм.</th>
        <th className="px-4 py-2">Дата</th>
        <th className="px-4 py-2">Действия</th>
      </tr>
    }>
      {resumes.map((r) => (
        <tr key={r.id} className="even:bg-zinc-50">
          <td className="px-4 py-2 font-medium text-zinc-900">{r.title}</td>
          <td className="px-4 py-2 text-zinc-500">{r.user.name || r.user.email}</td>
          <td className="px-4 py-2 text-zinc-500">{r.roleGoal}</td>
          <td className="px-4 py-2">
            <Badge color={r.isPublic ? "green" : "gray"}>{r.isPublic ? "Публичное" : "Скрытое"}</Badge>
          </td>
          <td className="px-4 py-2 text-zinc-500">{r.viewCount}</td>
          <td className="px-4 py-2 text-zinc-400">{r.createdAt.toLocaleDateString("ru-RU")}</td>
          <td className="px-4 py-2">
            <div className="flex flex-col gap-1">
              <ResumeEditRow id={r.id} title={r.title} roleGoal={r.roleGoal} isPublic={r.isPublic && !r.hiddenByInactivity} />
              <HideBtn contentType="RESUME" id={r.id} />
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}

async function MatchesTab() {
  const profiles = await prisma.matchProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <Table head={
      <tr>
        <th className="px-4 py-2">Заголовок</th>
        <th className="px-4 py-2">Автор</th>
        <th className="px-4 py-2">Ищет</th>
        <th className="px-4 py-2">Статус</th>
        <th className="px-4 py-2">Просм.</th>
        <th className="px-4 py-2">Дата</th>
        <th className="px-4 py-2">Действия</th>
      </tr>
    }>
      {profiles.map((p) => (
        <tr key={p.id} className="even:bg-zinc-50 align-top">
          <td className="px-4 py-2 font-medium text-zinc-900">{p.title}</td>
          <td className="px-4 py-2 text-zinc-500">{p.user.name || p.user.email}</td>
          <td className="px-4 py-2 text-zinc-500">{p.lookingFor}</td>
          <td className="px-4 py-2"><Badge color={statusColor(p.status)}>{p.status}</Badge></td>
          <td className="px-4 py-2 text-zinc-500">{p.viewCount}</td>
          <td className="px-4 py-2 text-zinc-400">{p.createdAt.toLocaleDateString("ru-RU")}</td>
          <td className="px-4 py-2">
            <div className="flex flex-col gap-1">
              <EditRow action={adminEditMatchProfileAction} idField="matchProfileId" id={p.id} title={p.title} status={p.status} />
              <HideBtn contentType="MATCH_PROFILE" id={p.id} />
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}
