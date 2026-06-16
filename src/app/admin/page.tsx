import type { Metadata } from "next";
import { reviewPaymentAction, reviewReportAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  await requireRole(["ADMIN"]);

  const [pendingPayments, pendingArticles, pendingListings, reports] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.article.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" } }),
    prisma.listing.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" } }),
    prisma.report.findMany({ where: { status: "PENDING_REVIEW" }, include: { reporter: true }, orderBy: { createdAt: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Админ-панель</h1>

      <TreeRoot title="Жалобы и модерация">
        <TreeBranch label={`На проверке (${reports.length})`}>
          {reports.length === 0 && <p className="text-sm text-zinc-500">Нет жалоб в очереди.</p>}
          {reports.map((report) => (
            <TreeLeaf key={report.id}>
              <p>{report.targetType} • {report.targetId}</p>
              <p className="text-xs text-zinc-500">{report.reason} • от {report.reporter.email || report.reporter.name}</p>
              <div className="mt-2 flex gap-2">
                <form action={reviewReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="decision" value="hide" />
                  <button className="rounded bg-red-600 px-3 py-1 text-white" type="submit">Скрыть</button>
                </form>
                <form action={reviewReportAction}>
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="decision" value="resolve" />
                  <button className="rounded bg-emerald-600 px-3 py-1 text-white" type="submit">Разрешить</button>
                </form>
              </div>
            </TreeLeaf>
          ))}
        </TreeBranch>
      </TreeRoot>

      <TreeRoot title="Будущий модуль платежей">
        <TreeBranch label={`PENDING (${pendingPayments.length})`}>
          {pendingPayments.length === 0 && <p className="text-sm text-zinc-500">Нет платежей в очереди.</p>}
          {pendingPayments.map((payment) => (
            <TreeLeaf key={payment.id}>
              <p>{payment.type} • ${payment.amountUsd.toString()} • ref: {payment.referenceType}:{payment.referenceId}</p>
              <p className="text-xs text-zinc-500">TX: {payment.txHash || "-"}</p>
              <div className="mt-2 flex gap-2">
                <form action={reviewPaymentAction}>
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="rounded bg-emerald-600 px-3 py-1 text-white" type="submit">Approve</button>
                </form>
                <form action={reviewPaymentAction}>
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input type="hidden" name="reason" value="Платеж не подтвержден" />
                  <button className="rounded bg-red-600 px-3 py-1 text-white" type="submit">Reject</button>
                </form>
              </div>
            </TreeLeaf>
          ))}
        </TreeBranch>
      </TreeRoot>

      <TreeRoot title="Дерево контента на модерации">
        <TreeBranch label={`Статьи (${pendingArticles.length})`}>
          {pendingArticles.map((article) => (
            <TreeLeaf key={article.id}>{article.title}</TreeLeaf>
          ))}
        </TreeBranch>
        <TreeBranch label={`Вакансии/услуги (${pendingListings.length})`}>
          {pendingListings.map((listing) => (
            <TreeLeaf key={listing.id}>{listing.title}</TreeLeaf>
          ))}
        </TreeBranch>
      </TreeRoot>
    </div>
  );
}
