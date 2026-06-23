import type { Metadata } from "next";
import { topUpBalanceAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Баланс</h1>

      <TreeRoot title="Пополнить баланс студии">
        <TreeBranch label="Пополнить">
          <form action={topUpBalanceAction} className="space-y-3 p-2">
            <div>
              <label className="block text-sm font-medium">Пользователь</label>
              <select className="mt-1 w-full rounded border p-2 text-sm" name="userId" required>
                <option value="">Выберите студию</option>
                {providerUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email || u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Сумма (центы)</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" type="number" name="amountCents" min={100} max={10000000} required placeholder="1500 = $15" />
              <p className="mt-1 text-xs text-zinc-500">1500 = $15, 500 = $5</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Заметка</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" type="text" name="note" placeholder="Admin top-up" />
            </div>
            <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white" type="submit">Пополнить баланс</button>
          </form>
        </TreeBranch>
      </TreeRoot>

      <TreeRoot title={`Балансы студий (${balances.length})`}>
        {balances.length === 0 && <p className="text-sm text-zinc-500">Нет балансов.</p>}
        {balances.map((b) => (
          <TreeLeaf key={b.id}>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="font-medium">{b.user.name || b.user.email}</span>
              <span>Доступно: ${(b.availableUsd / 100).toFixed(2)}</span>
              <span>Холд: ${(b.holdUsd / 100).toFixed(2)}</span>
            </div>
          </TreeLeaf>
        ))}
      </TreeRoot>

      <TreeRoot title={`Последние транзакции (${recentTransactions.length})`}>
        {recentTransactions.length === 0 && <p className="text-sm text-zinc-500">Транзакций пока нет.</p>}
        {recentTransactions.map((tx) => (
          <TreeLeaf key={tx.id}>
            <p>{tx.type} • ${(tx.amountCents / 100).toFixed(2)} • {tx.user.name || tx.user.email}</p>
            <p className="text-xs text-zinc-500">{tx.note || "-"} • {tx.createdAt.toLocaleDateString("ru-RU")}</p>
          </TreeLeaf>
        ))}
      </TreeRoot>
    </div>
  );
}
