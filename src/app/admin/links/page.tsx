import type { Metadata } from "next";
import Link from "next/link";
import { deleteUsefulLinkAction, toggleUsefulLinkAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Ссылки",
  robots: { index: false, follow: false },
};

export default async function LinksAdminPage() {
  await requireRole(["ADMIN"]);

  const links = await prisma.usefulLink.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Полезные ссылки</h1>
        <Link href="/admin/links/new" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Создать
        </Link>
      </div>

      <Table head={
        <tr>
          <th className="px-3 py-2">Название</th>
          <th className="px-3 py-2">URL</th>
          <th className="px-3 py-2">Тема</th>
          <th className="px-3 py-2">Опубликован</th>
          <th className="px-3 py-2">Порядок</th>
          <th className="px-3 py-2">Действия</th>
        </tr>
      }>
        {links.map((link) => (
          <tr key={link.id} className="border-t border-zinc-100">
            <td className="px-3 py-2 text-sm font-medium text-zinc-900">
              <Link href={`/admin/links/${link.id}`} className="hover:underline">
                {link.title}
              </Link>
            </td>
            <td className="px-3 py-2 text-xs text-zinc-500 font-mono max-w-[200px] truncate">
              {link.url}
            </td>
            <td className="px-3 py-2 text-sm">
              <Badge color="blue">{link.topic}</Badge>
            </td>
            <td className="px-3 py-2 text-sm">
              <form action={toggleUsefulLinkAction}>
                <input type="hidden" name="id" value={link.id} />
                <button type="submit" className="text-xs hover:underline">
                  <Badge color={link.isPublished ? "green" : "gray"}>{link.isPublished ? "Да" : "Нет"}</Badge>
                </button>
              </form>
            </td>
            <td className="px-3 py-2 text-sm text-zinc-600">{link.sortOrder}</td>
            <td className="px-3 py-2 text-sm">
              <div className="flex gap-2">
                <Link href={`/admin/links/${link.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                  Ред.
                </Link>
                <form action={deleteUsefulLinkAction}>
                  <input type="hidden" name="id" value={link.id} />
                  <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                    Удалить
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {links.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3 py-6 text-center text-sm text-zinc-500">
              Нет ссылок. Создайте первую или запустите seed-скрипт.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
