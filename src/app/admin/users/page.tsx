import type { Metadata } from "next";
import { blockUserAction, changeUserRoleAction, unblockUserAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Пользователи",
  robots: { index: false, follow: false },
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"]);
  const { q } = await searchParams;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
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
  });

  const isBlocked = (u: (typeof users)[number]) =>
    u.blockedPermanently || (u.blockedUntil && u.blockedUntil > new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Пользователи</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск по имени или email"
          className="w-full rounded border p-2 text-sm"
        />
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Найти
        </button>
      </form>

      <TreeRoot title={`Результаты (${users.length})`}>
        {users.length === 0 && <p className="text-sm text-zinc-500">Никого не найдено.</p>}
        {users.map((u) => (
          <TreeBranch key={u.id} label={`${u.name || u.email || u.id} — ${u.role}`} defaultOpen={false}>
            <TreeLeaf>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span>Email: {u.email || "—"}</span>
                  <span>Роль: {u.role}</span>
                  <span>Профиль: {u.profileKind}</span>
                  <span>Режим: {u.accountMode}</span>
                  <span>Создан: {u.createdAt.toLocaleDateString("ru-RU")}</span>
                  <span>Нарушения: {u.violationCount}</span>
                  {isBlocked(u) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                      Заблокирован{u.blockedPermanently ? " (навсегда)" : ` до ${u.blockedUntil!.toLocaleDateString("ru-RU")}`}
                    </span>
                  )}
                </div>

                {/* Change role */}
                <form action={changeUserRoleAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <div>
                    <label className="block text-xs font-medium">Роль</label>
                    <select name="newRole" defaultValue={u.role} className="mt-1 rounded border p-1.5 text-sm">
                      <option value="USER">USER</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                    Сменить роль
                  </button>
                </form>

                {/* Block */}
                {!isBlocked(u) && (
                  <form action={blockUserAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <div>
                      <label className="block text-xs font-medium">Дней (0 = навсегда)</label>
                      <input type="number" name="days" min={0} defaultValue={0} className="mt-1 w-20 rounded border p-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Причина</label>
                      <input type="text" name="reason" className="mt-1 rounded border p-1.5 text-sm" placeholder="Причина" />
                    </div>
                    <button type="submit" className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white">
                      Заблокировать
                    </button>
                  </form>
                )}

                {/* Unblock */}
                {isBlocked(u) && (
                  <form action={unblockUserAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button type="submit" className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                      Разблокировать
                    </button>
                  </form>
                )}
              </div>
            </TreeLeaf>
          </TreeBranch>
        ))}
      </TreeRoot>
    </div>
  );
}
