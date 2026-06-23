import type { Metadata } from "next";
import Link from "next/link";
import { reviewReportAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Жалобы",
  robots: { index: false, follow: false },
};

const statusFilters = [
  { key: "", label: "Все" },
  { key: "PENDING_REVIEW", label: "На проверке" },
  { key: "HIDDEN", label: "Скрытые" },
  { key: "RESOLVED", label: "Решённые" },
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Жалобы</h1>

      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/reports?status=${f.key}` : "/admin/reports"}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              (filterStatus ?? "") === f.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <TreeRoot title={`Жалобы (${reports.length})`}>
        {reports.length === 0 && <p className="text-sm text-zinc-500">Нет жалоб.</p>}
        {reports.map((report) => (
          <TreeLeaf key={report.id}>
            <div className="space-y-1">
              <p className="font-medium">{report.targetType} : {report.targetId}</p>
              <p className="text-xs text-zinc-500">
                Причина: {report.reason} | Статус: {report.status} | От: {report.reporter.name || report.reporter.email}
              </p>
              <p className="text-xs text-zinc-400">{report.createdAt.toLocaleDateString("ru-RU")}</p>
              {report.status === "PENDING_REVIEW" && (
                <div className="mt-2 flex gap-2">
                  <form action={reviewReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="decision" value="hide" />
                    <button className="rounded bg-red-600 px-3 py-1 text-xs text-white" type="submit">Скрыть</button>
                  </form>
                  <form action={reviewReportAction}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="decision" value="resolve" />
                    <button className="rounded bg-emerald-600 px-3 py-1 text-xs text-white" type="submit">Разрешить</button>
                  </form>
                </div>
              )}
            </div>
          </TreeLeaf>
        ))}
      </TreeRoot>
    </div>
  );
}
