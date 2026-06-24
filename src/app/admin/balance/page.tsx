import type { Metadata } from "next";
import { topUpBalanceAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Баланс",
  robots: { index: false, follow: false },
};

export default async function BalancePage() {
  await requireRole(["ADMIN"]);

  const [providerUsers, recentTransactions, balances] = await Promise.all([
    prisma.user.findMany({
      where: { accountMode: { in: ["PROVIDER", "BOTH"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.balanceTransaction.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.studioBalance.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Баланс</h1>

      <Card className="max-w-lg">
        <CardTitle>Пополнить баланс студии</CardTitle>
        <form action={topUpBalanceAction} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Пользователь</label>
            <select className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm" name="userId" required>
              <option value="">Выберите студию</option>
              {providerUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Сумма (центы)</label>
            <input className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm" type="number" name="amountCents" min={100} max={10000000} required placeholder="1500 = $15" />
            <p className="mt-1 text-xs text-zinc-500">1500 = $15, 500 = $5</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Заметка</label>
            <input className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm" type="text" name="note" placeholder="Admin top-up" />
          </div>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white" type="submit">Пополнить баланс</button>
        </form>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Балансы студий ({balances.length})</h2>
        <Table head={
          <tr>
            <th className="px-4 py-2">Студия</th>
            <th className="px-4 py-2">Доступно</th>
            <th className="px-4 py-2">В холде</th>
          </tr>
        }>
          {balances.length === 0 && (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-zinc-500">Нет балансов.</td></tr>
          )}
          {balances.map((b) => (
            <tr key={b.id} className="even:bg-zinc-50">
              <td className="px-4 py-2 font-medium text-zinc-900">{b.user.name || b.user.email}</td>
              <td className="px-4 py-2 text-emerald-700">${(b.availableUsd / 100).toFixed(2)}</td>
              <td className="px-4 py-2 text-zinc-500">${(b.holdUsd / 100).toFixed(2)}</td>
            </tr>
          ))}
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Последние транзакции ({recentTransactions.length})</h2>
        <Table head={
          <tr>
            <th className="px-4 py-2">Тип</th>
            <th className="px-4 py-2">Сумма</th>
            <th className="px-4 py-2">Пользователь</th>
            <th className="px-4 py-2">Заметка</th>
            <th className="px-4 py-2">Дата</th>
          </tr>
        }>
          {recentTransactions.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">Транзакций пока нет.</td></tr>
          )}
          {recentTransactions.map((tx) => (
            <tr key={tx.id} className="even:bg-zinc-50">
              <td className="px-4 py-2 font-medium text-zinc-900">{tx.type}</td>
              <td className="px-4 py-2 text-zinc-700">${(tx.amountCents / 100).toFixed(2)}</td>
              <td className="px-4 py-2 text-zinc-500">{tx.user.name || tx.user.email}</td>
              <td className="px-4 py-2 text-zinc-500">{tx.note || "—"}</td>
              <td className="px-4 py-2 text-zinc-400">{tx.createdAt.toLocaleDateString("ru-RU")}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
