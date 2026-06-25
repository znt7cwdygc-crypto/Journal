import type { Metadata } from "next";
import Link from "next/link";
import { deleteGuideAction, toggleGuideHomeAction, toggleGuidePublishAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Гайды",
  robots: { index: false, follow: false },
};

const kindLabels: Record<string, string> = {
  guide: "Гайд",
  vacancy: "Вакансия",
  service: "Услуга",
  resume: "Резюме",
};

export default async function GuidesAdminPage() {
  await requireRole(["ADMIN"]);

  const guides = await prisma.guide.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Гайды и SEO-лендинги</h1>
        <Link href="/admin/guides/new" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Создать
        </Link>
      </div>

      <Table head={
        <tr>
          <th className="px-3 py-2">Название</th>
          <th className="px-3 py-2">Тип</th>
          <th className="px-3 py-2">Путь</th>
          <th className="px-3 py-2">Опубликован</th>
          <th className="px-3 py-2">На главной</th>
          <th className="px-3 py-2">Порядок</th>
          <th className="px-3 py-2">Действия</th>
        </tr>
      }>
        {guides.map((guide) => (
          <tr key={guide.id} className="border-t border-zinc-100">
            <td className="px-3 py-2 text-sm font-medium text-zinc-900">
              <Link href={`/admin/guides/${guide.id}`} className="hover:underline">
                {guide.title.length > 50 ? guide.title.slice(0, 50) + "..." : guide.title}
              </Link>
            </td>
            <td className="px-3 py-2 text-sm">
              <Badge color="blue">{kindLabels[guide.kind] || guide.kind}</Badge>
            </td>
            <td className="px-3 py-2 text-xs text-zinc-500 font-mono">{guide.path}</td>
            <td className="px-3 py-2 text-sm">
              <form action={toggleGuidePublishAction}>
                <input type="hidden" name="id" value={guide.id} />
                <button type="submit" className="text-xs hover:underline">
                  <Badge color={guide.isPublished ? "green" : "gray"}>{guide.isPublished ? "Да" : "Нет"}</Badge>
                </button>
              </form>
            </td>
            <td className="px-3 py-2 text-sm">
              <form action={toggleGuideHomeAction}>
                <input type="hidden" name="id" value={guide.id} />
                <button type="submit" className="text-xs hover:underline">
                  <Badge color={guide.showOnHome ? "green" : "gray"}>{guide.showOnHome ? "Да" : "Нет"}</Badge>
                </button>
              </form>
            </td>
            <td className="px-3 py-2 text-sm text-zinc-600">{guide.sortOrder}</td>
            <td className="px-3 py-2 text-sm">
              <div className="flex gap-2">
                <Link href={`/admin/guides/${guide.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                  Ред.
                </Link>
                <form action={deleteGuideAction} onSubmit={undefined}>
                  <input type="hidden" name="id" value={guide.id} />
                  <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                    Удалить
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {guides.length === 0 && (
          <tr>
            <td colSpan={7} className="px-3 py-6 text-center text-sm text-zinc-500">
              Нет гайдов. Создайте первый или запустите seed-скрипт.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
