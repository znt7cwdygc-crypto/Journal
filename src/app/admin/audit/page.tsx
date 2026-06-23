import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeRoot } from "@/components/tree";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Аудит-лог</h1>

      <div className="flex gap-1 overflow-x-auto">
        <Link
          href="/admin/audit"
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
            !filterAction ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Все
        </Link>
        {actions.map((a) => (
          <Link
            key={a.action}
            href={`/admin/audit?action=${a.action}`}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              filterAction === a.action ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {a.action} ({a._count})
          </Link>
        ))}
      </div>

      <TreeRoot title={`Записи (${logs.length})`}>
        {logs.length === 0 && <p className="text-sm text-zinc-500">Пусто.</p>}
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border border-soft bg-white px-3 py-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{log.action}</span>
                <span className="text-xs text-zinc-500">{log.targetType}:{log.targetId}</span>
                <span className="ml-auto text-xs text-zinc-400">
                  {log.user.name || log.user.email} | {log.createdAt.toLocaleString("ru-RU")}
                </span>
              </div>
              {log.details && <p className="mt-1 text-xs text-zinc-500">{log.details}</p>}
            </div>
          ))}
        </div>
      </TreeRoot>
    </div>
  );
}
