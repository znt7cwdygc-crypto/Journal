import type { Metadata } from "next";
import { reviewPaymentAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardTitle, Table, statusColor } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Платежи",
  robots: { index: false, follow: false },
};

export default async function PaymentsPage() {
  await requireRole(["ADMIN"]);

  const [pendingPayments, recentPayments] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Платежи</h1>
        <p className="text-sm text-zinc-500">Управление платежами</p>
      </div>

      <Card>
        <CardTitle>Ожидают подтверждения ({pendingPayments.length})</CardTitle>
        {pendingPayments.length === 0 ? (
          <p className="text-sm text-zinc-500">Нет платежей в очереди.</p>
        ) : (
          <div className="space-y-2">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{payment.type} • ${payment.amountUsd.toString()} • ref: {payment.referenceType}:{payment.referenceId}</p>
                  <p className="text-xs text-zinc-500">TX: {payment.txHash || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <form action={reviewPaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white" type="submit">Approve</button>
                  </form>
                  <form action={reviewPaymentAction}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input type="hidden" name="reason" value="Платеж не подтвержден" />
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white" type="submit">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {recentPayments.length > 0 && (
        <Card className="p-0">
          <div className="px-5 pt-5"><CardTitle>Последние обработанные</CardTitle></div>
          <Table head={
            <tr>
              <th className="px-4 py-2">Тип</th>
              <th className="px-4 py-2">Сумма</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">TX</th>
              <th className="px-4 py-2">Дата</th>
            </tr>
          }>
            {recentPayments.map((payment) => (
              <tr key={payment.id} className="even:bg-zinc-50">
                <td className="px-4 py-2 font-medium text-zinc-900">{payment.type}</td>
                <td className="px-4 py-2 text-zinc-700">${payment.amountUsd.toString()}</td>
                <td className="px-4 py-2"><Badge color={statusColor(payment.status)}>{payment.status}</Badge></td>
                <td className="px-4 py-2 text-xs text-zinc-500">{payment.txHash || "—"}</td>
                <td className="px-4 py-2 text-zinc-400">{payment.createdAt.toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
