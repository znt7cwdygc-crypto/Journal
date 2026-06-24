import type { Metadata } from "next";
import { blockUserAction, changeUserRoleAction, unblockUserAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Пользователи",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; take?: string }> }) {
  await requireRole(["ADMIN"]);
  const { q, take: takeRaw } = await searchParams;
  const take = Math.min(Math.max(Number(takeRaw) || PAGE_SIZE, PAGE_SIZE), 500);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileKind: true,
        accountMode: true,
        createdAt: true,
        blockedUntil: true,
        blockedPermanently: true,
        blockReason: true,
        violationCount: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const isBlocked = (u: (typeof users)[number]) =>
    u.blockedPermanently || (u.blockedUntil && u.blockedUntil > new Date());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Пользователи</h1>
        <p className="text-sm text-zinc-500">Всего: {total}</p>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск по имени или email"
          className="w-full max-w-md rounded-lg border border-zinc-300 p-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Найти
        </button>
      </form>

      <Table head={
        <tr>
          <th className="px-4 py-2">Имя</th>
          <th className="px-4 py-2">Email</th>
          <th className="px-4 py-2">Роль</th>
          <th className="px-4 py-2">Профиль</th>
          <th className="px-4 py-2">Режим</th>
          <th className="px-4 py-2">Статус</th>
          <th className="px-4 py-2">Наруш.</th>
          <th className="px-4 py-2">Рег.</th>
          <th className="px-4 py-2">Действия</th>
        </tr>
      }>
        {users.length === 0 && (
          <tr><td colSpan={9} className="px-4 py-6 text-center text-zinc-500">Никого не найдено.</td></tr>
        )}
        {users.map((u) => {
          const blocked = isBlocked(u);
          return (
            <tr key={u.id} className={blocked ? "bg-red-50" : "even:bg-zinc-50"}>
              <td className="px-4 py-2 font-medium text-zinc-900">{u.name || "—"}</td>
              <td className="px-4 py-2 text-zinc-500">{u.email || "—"}</td>
              <td className="px-4 py-2">
                <form action={changeUserRoleAction} className="flex items-center gap-1">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="newRole" defaultValue={u.role} className="rounded border border-zinc-300 p-1 text-xs">
                    <option value="USER">USER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button type="submit" className="rounded bg-zinc-900 px-2 py-1 text-xs text-white">OK</button>
                </form>
              </td>
              <td className="px-4 py-2 text-zinc-500">{u.profileKind}</td>
              <td className="px-4 py-2 text-zinc-500">{u.accountMode}</td>
              <td className="px-4 py-2">
                {blocked ? (
                  <Badge color="red">
                    {u.blockedPermanently ? "Навсегда" : `До ${u.blockedUntil!.toLocaleDateString("ru-RU")}`}
                  </Badge>
                ) : (
                  <Badge color="green">Активен</Badge>
                )}
              </td>
              <td className="px-4 py-2">
                {u.violationCount > 0 ? <Badge color="amber">{u.violationCount}</Badge> : <span className="text-zinc-400">0</span>}
              </td>
              <td className="px-4 py-2 text-zinc-400">{u.createdAt.toLocaleDateString("ru-RU")}</td>
              <td className="px-4 py-2">
                {blocked ? (
                  <form action={unblockUserAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white">Разблок.</button>
                  </form>
                ) : (
                  <details className="relative">
                    <summary className="cursor-pointer rounded bg-red-600 px-2 py-1 text-xs font-medium text-white">Блок</summary>
                    <form action={blockUserAction} className="absolute right-0 z-10 mt-1 w-56 space-y-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                      <input type="hidden" name="userId" value={u.id} />
                      <div>
                        <label className="block text-xs font-medium text-zinc-500">Дней (0 = навсегда)</label>
                        <input type="number" name="days" min={0} defaultValue={0} className="mt-1 w-full rounded border border-zinc-300 p-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500">Причина</label>
                        <input type="text" name="reason" className="mt-1 w-full rounded border border-zinc-300 p-1.5 text-sm" placeholder="Причина" />
                      </div>
                      <button type="submit" className="w-full rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white">Заблокировать</button>
                    </form>
                  </details>
                )}
              </td>
            </tr>
          );
        })}
      </Table>

      {users.length < total && (
        <div className="text-center">
          <a
            href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), take: String(take + PAGE_SIZE) }).toString()}`}
            className="inline-block rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Показать ещё
          </a>
        </div>
      )}
    </div>
  );
}
