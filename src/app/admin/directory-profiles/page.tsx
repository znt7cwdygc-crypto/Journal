import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  approveDirectoryProfileAction,
  hideDirectoryProfileAction,
  requestDirectoryProfileChangesAction
} from "@/app/actions";
import { Badge, Card, CardTitle, Table } from "@/components/admin/ui";
import { isCatalogEnabled } from "@/lib/features";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Организации",
  robots: { index: false, follow: false }
};

const statusColorMap: Record<string, "green" | "amber" | "red" | "zinc" | "blue"> = {
  DRAFT: "zinc",
  PENDING_REVIEW: "amber",
  PUBLISHED: "green",
  CHANGES_REQUESTED: "red",
  HIDDEN: "zinc",
  ARCHIVED: "zinc"
};

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PENDING_REVIEW: "На проверке",
  PUBLISHED: "Опубликована",
  CHANGES_REQUESTED: "Нужны правки",
  HIDDEN: "Скрыта",
  ARCHIVED: "Архив"
};

export default async function DirectoryProfilesAdminPage() {
  if (!isCatalogEnabled()) notFound();
  await requireRole(["ADMIN", "MODERATOR"]);

  const profiles = await prisma.directoryProfile.findMany({
    include: { owner: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
  });

  const pending = profiles.filter((p) => p.status === "PENDING_REVIEW");
  const rest = profiles.filter((p) => p.status !== "PENDING_REVIEW");

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Организации (студии/агентства)</h1>

      {pending.length > 0 && (
        <Card>
          <CardTitle>На проверке — {pending.length}</CardTitle>
          <div className="space-y-4">
            {pending.map((p) => (
              <div key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{p.name} <span className="ml-1 text-xs font-normal text-zinc-500">({p.type === "STUDIO" ? "студия" : "агентство"})</span></p>
                    <p className="text-xs text-zinc-500">Владелец: {p.owner.name || p.owner.email} · {p.city || "онлайн"}</p>
                  </div>
                  <Badge color={statusColorMap[p.status]}>{statusLabels[p.status]}</Badge>
                </div>
                <p className="mt-2 text-sm text-zinc-700">{p.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={approveDirectoryProfileAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700" type="submit">
                      Одобрить
                    </button>
                  </form>
                  <form action={requestDirectoryProfileChangesAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs" name="reason" placeholder="Что поправить" required />
                    <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700" type="submit">
                      Запросить правки
                    </button>
                  </form>
                  <form action={hideDirectoryProfileAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="reason" value="Отклонена при первой модерации" />
                    <button className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-300" type="submit">
                      Скрыть
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Все организации — {rest.length}</CardTitle>
        <Table
          head={
            <tr>
              <th className="px-3 py-2">Название</th>
              <th className="px-3 py-2">Тип</th>
              <th className="px-3 py-2">Город</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Владелец</th>
              <th className="px-3 py-2">Действия</th>
            </tr>
          }
        >
          {rest.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 text-sm font-medium text-zinc-900">{p.name}</td>
              <td className="px-3 py-2 text-sm">{p.type === "STUDIO" ? "Студия" : "Агентство"}</td>
              <td className="px-3 py-2 text-sm text-zinc-500">{p.city || "Онлайн"}</td>
              <td className="px-3 py-2 text-sm">
                <Badge color={statusColorMap[p.status]}>{statusLabels[p.status]}</Badge>
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">{p.owner.name || p.owner.email}</td>
              <td className="px-3 py-2 text-sm">
                {p.status === "PUBLISHED" ? (
                  <form action={hideDirectoryProfileAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs font-semibold text-hot hover:underline" type="submit">Скрыть</button>
                  </form>
                ) : p.status === "HIDDEN" ? (
                  <form action={approveDirectoryProfileAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs font-semibold text-accent hover:underline" type="submit">Вернуть в каталог</button>
                  </form>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
          {rest.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-sm text-zinc-500" colSpan={6}>Пока пусто.</td>
            </tr>
          )}
        </Table>
      </Card>
    </div>
  );
}
