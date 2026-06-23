import type { Metadata } from "next";
import { createAdvertisementAction, deleteListingReviewAction, reviewPaymentAction, toggleAdvertisementAction, updateAdvertisementAction } from "@/app/actions";
import { adMonthlyPriceUsd, adPlacementLabel, adPlacements } from "@/lib/ads";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { TreeBranch, TreeLeaf, TreeRoot } from "@/components/tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Дашборд",
  robots: { index: false, follow: false }
};

export default async function AdminPage() {
  await requireRole(["ADMIN"]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    articlesByStatus,
    listingsCount,
    productsCount,
    resumesCount,
    inviteStats,
    inviteRevenue,
    activeReports,
    recentAudit,
    pendingPayments,
    listingReviews,
    advertisements,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.article.groupBy({ by: ["status"], _count: true }),
    prisma.listing.count(),
    prisma.product.count(),
    prisma.resume.count(),
    prisma.invite.groupBy({ by: ["status"], _count: true }),
    prisma.balanceTransaction.aggregate({ where: { type: "CHARGE" }, _sum: { amountCents: true } }),
    prisma.report.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.listingReview.findMany({
      where: { listing: { type: "SERVICE" } },
      include: { listing: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.advertisement.findMany({
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
  ]);

  const articleStatusMap = Object.fromEntries(articlesByStatus.map((s) => [s.status, s._count]));
  const inviteStatusMap = Object.fromEntries(inviteStats.map((s) => [s.status, s._count]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Дашборд</h1>

      <TreeRoot title="Пользователи">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Всего" value={totalUsers} />
          <Stat label="За неделю" value={newUsersWeek} />
          <Stat label="За месяц" value={newUsersMonth} />
        </div>
      </TreeRoot>

      <TreeRoot title="Контент">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Статьи (опубл.)" value={articleStatusMap["PUBLISHED"] ?? 0} />
          <Stat label="Статьи (черн.)" value={articleStatusMap["DRAFT"] ?? 0} />
          <Stat label="Статьи (архив)" value={articleStatusMap["ARCHIVED"] ?? 0} />
          <Stat label="На проверке" value={articleStatusMap["PENDING_REVIEW"] ?? 0} />
          <Stat label="Объявления" value={listingsCount} />
          <Stat label="Товары" value={productsCount} />
          <Stat label="Резюме" value={resumesCount} />
        </div>
      </TreeRoot>

      <TreeRoot title="Инвайты">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Отправлено" value={inviteStatusMap["PENDING"] ?? 0} />
          <Stat label="Принято" value={inviteStatusMap["ACCEPTED"] ?? 0} />
          <Stat label="Отклонено" value={inviteStatusMap["DECLINED"] ?? 0} />
          <Stat label="Истекло" value={inviteStatusMap["EXPIRED"] ?? 0} />
          <Stat label="Доход (charge)" value={`$${((inviteRevenue._sum.amountCents ?? 0) / 100).toFixed(2)}`} />
        </div>
      </TreeRoot>

      <TreeRoot title="Жалобы">
        <p className="text-sm">Активных жалоб: <span className="font-semibold text-red-600">{activeReports}</span></p>
      </TreeRoot>

      <TreeRoot title="Последний аудит-лог">
        <div className="space-y-1">
          {recentAudit.length === 0 && <p className="text-sm text-zinc-500">Пусто.</p>}
          {recentAudit.map((log) => (
            <div key={log.id} className="rounded-md bg-stone-50 px-3 py-2 text-sm">
              <span className="font-medium">{log.action}</span> — {log.targetType}:{log.targetId}
              <span className="ml-2 text-xs text-zinc-500">{log.user.name || log.user.email} • {log.createdAt.toLocaleDateString("ru-RU")}</span>
            </div>
          ))}
        </div>
      </TreeRoot>

      <TreeRoot title="Реклама">
        <TreeBranch label="Создать баннер">
          <form action={createAdvertisementAction} className="grid gap-3 p-2 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Раздел</label>
              <select className="mt-1 w-full rounded border p-2 text-sm" name="placement" required>
                {adPlacements.map((placement) => (
                  <option key={placement.value} value={placement.value}>{placement.label} — ${adMonthlyPriceUsd(placement.value)}/мес</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Название</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="title" maxLength={120} required placeholder="Например: Настройка OBS под ключ" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Короткое описание</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="description" maxLength={220} placeholder="1 строка под баннером" />
            </div>
            <div>
              <label className="block text-sm font-medium">Картинка/GIF URL</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="imageUrl" type="url" required placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium">Ссылка перехода</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="targetUrl" type="url" required placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium">Старт</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="startsAt" type="datetime-local" />
            </div>
            <div>
              <label className="block text-sm font-medium">Окончание</label>
              <input className="mt-1 w-full rounded border p-2 text-sm" name="expiresAt" type="datetime-local" />
            </div>
            <button className="rounded bg-hot px-4 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
              Создать рекламу
            </button>
          </form>
        </TreeBranch>
        <TreeBranch label={`Активные и архив (${advertisements.length})`}>
          {advertisements.length === 0 && <p className="text-sm text-zinc-500">Рекламы пока нет.</p>}
          {advertisements.map((ad) => (
            <TreeLeaf key={ad.id}>
              <div className="space-y-3">
                <div className="min-w-0">
                  <p className="font-medium">{ad.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {adPlacementLabel(ad.placement)} • ${adMonthlyPriceUsd(ad.placement)}/мес • {ad.status} • клики: {ad.clickCount} • создал {ad.createdBy.name || ad.createdBy.email}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Цена размещения: ${adMonthlyPriceUsd(ad.placement)} в месяц
                  </p>
                  {ad.description && <p className="mt-1 text-sm text-zinc-600">{ad.description}</p>}
                  <a className="mt-1 block truncate text-xs text-accent" href={ad.targetUrl} target="_blank" rel="noreferrer">{ad.targetUrl}</a>
                </div>
                <form action={updateAdvertisementAction} className="grid gap-2 rounded-lg bg-zinc-50 p-3 md:grid-cols-2">
                  <input type="hidden" name="adId" value={ad.id} />
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500">Место рекламы</label>
                    <select className="mt-1 w-full rounded border p-2 text-sm" name="placement" defaultValue={ad.placement} required>
                      {adPlacements.map((placement) => (
                        <option key={placement.value} value={placement.value}>{placement.label} — ${adMonthlyPriceUsd(placement.value)}/мес</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500">Название</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="title" defaultValue={ad.title} maxLength={120} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500">Описание</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="description" defaultValue={ad.description || ""} maxLength={220} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500">Картинка/GIF именно для этого места</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="imageUrl" defaultValue={ad.imageUrl} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500">Ссылка именно для этого места</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="targetUrl" defaultValue={ad.targetUrl} type="url" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500">Старт</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="startsAt" type="datetime-local" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500">Окончание</label>
                    <input className="mt-1 w-full rounded border p-2 text-sm" name="expiresAt" type="datetime-local" />
                  </div>
                  <button className="rounded bg-hot px-3 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
                    Сохранить это место рекламы
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleAdvertisementAction}>
                    <input type="hidden" name="adId" value={ad.id} />
                    <input type="hidden" name="status" value={ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                    <button className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white" type="submit">
                      {ad.status === "ACTIVE" ? "Пауза" : "Активировать"}
                    </button>
                  </form>
                  <form action={toggleAdvertisementAction}>
                    <input type="hidden" name="adId" value={ad.id} />
                    <input type="hidden" name="status" value="ARCHIVED" />
                    <button className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white" type="submit">В архив</button>
                  </form>
                </div>
              </div>
            </TreeLeaf>
          ))}
        </TreeBranch>
      </TreeRoot>

      <TreeRoot title="Отзывы на услуги">
        <TreeBranch label={`Последние (${listingReviews.length})`}>
          {listingReviews.length === 0 && <p className="text-sm text-zinc-500">Отзывов пока нет.</p>}
          {listingReviews.map((review) => (
            <TreeLeaf key={review.id}>
              <p>{review.parentId ? "Ответ" : `Оценка ${review.rating || "-"} из 5`} • {review.listing.title}</p>
              <p className="text-xs text-zinc-500">{review.body} • от {review.user.email || review.user.name}</p>
              <div className="mt-2 flex gap-2">
                <form action={deleteListingReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <button className="rounded bg-red-600 px-3 py-1 text-white" type="submit">Удалить отзыв</button>
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-soft bg-white p-3 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{String(value)}</p>
    </div>
  );
}
