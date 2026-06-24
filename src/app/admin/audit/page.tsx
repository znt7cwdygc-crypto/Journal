import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Аудит-лог",
  robots: { index: false, follow: false },
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireRole(["ADMIN"]);
  const { action: filterAction } = await searchParams;

  const where = filterAction ? { action: filterAction } : {};

  const [logs, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { action: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Аудит-лог</h1>

      <form className="flex items-center gap-2">
        <label className="text-sm text-zinc-500">Тип действия:</label>
        <select
          name="action"
          defaultValue={filterAction ?? ""}
          className="rounded-lg border border-zinc-300 p-2 text-sm"
        >
          <option value="">Все</option>
          {actions.map((a) => (
            <option key={a.action} value={a.action}>{a.action} ({a._count})</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white">Фильтр</button>
        {filterAction && (
          <Link href="/admin/audit" className="text-sm text-zinc-500 hover:text-zinc-900">Сброс</Link>
        )}
      </form>

      <Table head={
        <tr>
          <th className="px-4 py-2">Дата</th>
          <th className="px-4 py-2">Админ</th>
          <th className="px-4 py-2">Действие</th>
          <th className="px-4 py-2">Тип</th>
          <th className="px-4 py-2">ID</th>
          <th className="px-4 py-2">Детали</th>
        </tr>
      }>
        {logs.length === 0 && (
          <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Пусто.</td></tr>
        )}
        {logs.map((log) => (
          <tr key={log.id} className="even:bg-zinc-50">
            <td className="whitespace-nowrap px-4 py-2 text-zinc-400">{log.createdAt.toLocaleString("ru-RU")}</td>
            <td className="px-4 py-2 text-zinc-500">{log.user.name || log.user.email}</td>
            <td className="px-4 py-2 font-medium text-zinc-900">{log.action}</td>
            <td className="px-4 py-2 text-zinc-500">{log.targetType}</td>
            <td className="px-4 py-2 text-zinc-500">{log.targetId}</td>
            <td className="px-4 py-2 text-zinc-500">{log.details || "—"}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
