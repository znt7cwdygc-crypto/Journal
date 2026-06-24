import type { Metadata } from "next";
import Link from "next/link";
import { reviewReportAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Table, statusColor } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Жалобы",
  robots: { index: false, follow: false },
};

const statusFilters = [
  { key: "", label: "Все" },
  { key: "PENDING_REVIEW", label: "На проверке" },
  { key: "HIDDEN", label: "Скрытые" },
  { key: "RESOLVED", label: "Разрешённые" },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["ADMIN", "MODERATOR"]);
  const { status: filterStatus } = await searchParams;

  const where = filterStatus && ["PENDING_REVIEW", "HIDDEN", "RESOLVED"].includes(filterStatus)
    ? { status: filterStatus as "PENDING_REVIEW" | "HIDDEN" | "RESOLVED" }
    : {};

  const reports = await prisma.report.findMany({
    where,
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Жалобы</h1>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/reports?status=${f.key}` : "/admin/reports"}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              (filterStatus ?? "") === f.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Table head={
        <tr>
          <th className="px-4 py-2">Тип</th>
          <th className="px-4 py-2">Цель</th>
          <th className="px-4 py-2">Причина</th>
          <th className="px-4 py-2">Автор жалобы</th>
          <th className="px-4 py-2">Статус</th>
          <th className="px-4 py-2">Дата</th>
          <th className="px-4 py-2">Действия</th>
        </tr>
      }>
        {reports.length === 0 && (
          <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500">Нет жалоб.</td></tr>
        )}
        {reports.map((report) => (
          <tr key={report.id} className="even:bg-zinc-50">
            <td className="px-4 py-2 font-medium text-zinc-900">{report.targetType}</td>
            <td className="px-4 py-2 text-zinc-500">{report.targetId}</td>
            <td className="px-4 py-2 text-zinc-500">{report.reason}</td>
            <td className="px-4 py-2 text-zinc-500">{report.reporter.name || report.reporter.email}</td>
            <td className="px-4 py-2"><Badge color={statusColor(report.status)}>{report.status}</Badge></td>
            <td className="px-4 py-2 text-zinc-400">{report.createdAt.toLocaleDateString("ru-RU")}</td>
            <td className="px-4 py-2">
              {report.status === "PENDING_REVIEW" ? (
                <div className="flex gap-2">
                  <form action={reviewReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="decision" value="hide" />
                    <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" type="submit">Скрыть</button>
                  </form>
                  <form action={reviewReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="decision" value="resolve" />
                    <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" type="submit">Разрешить</button>
                  </form>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
