import type { Metadata } from "next";
import { createAdvertisementAction, deleteListingReviewAction, reviewPaymentAction, toggleAdvertisementAction, updateAdvertisementAction } from "@/app/actions";
import { adMonthlyPriceUsd, adPlacementLabel, adPlacements } from "@/lib/ads";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardTitle, StatCard, Table, statusColor } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Дашборд",
  robots: { index: false, follow: false }
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm";
const labelCls = "block text-xs font-semibold text-zinc-500";

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
  const inviteRevenueUsd = ((inviteRevenue._sum.amountCents ?? 0) / 100).toFixed(2);
  const publishedArticles = articleStatusMap["PUBLISHED"] ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Дашборд</h1>
        <p className="text-sm text-zinc-500">Обзор платформы WebcamExpert Journal</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon="👥" accent="blue" value={totalUsers} label="Пользователи" sub={`+${newUsersWeek} за нед. / +${newUsersMonth} за мес.`} />
        <StatCard icon="📝" accent="green" value={publishedArticles} label="Статьи (опубл.)" sub={`${articleStatusMap["DRAFT"] ?? 0} черн. · ${articleStatusMap["PENDING_REVIEW"] ?? 0} на проверке`} />
        <StatCard icon="📂" accent="purple" value={listingsCount} label="Объявления" />
        <StatCard icon="🛒" accent="amber" value={productsCount} label="Товары" sub={`${resumesCount} резюме`} />
        <StatCard icon="💵" accent="green" value={`$${inviteRevenueUsd}`} label="Доход (charge)" />
        <StatCard icon="⚠️" accent="red" value={activeReports} label="Активные жалобы" />
      </div>

      {/* Invites */}
      <Card>
        <CardTitle>Инвайты</CardTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(() => {
            const m = Object.fromEntries(inviteStats.map((s) => [s.status, s._count]));
            return (
              <>
                <MiniStat label="Отправлено" value={m["PENDING"] ?? 0} />
                <MiniStat label="Принято" value={m["ACCEPTED"] ?? 0} />
                <MiniStat label="Отклонено" value={m["DECLINED"] ?? 0} />
                <MiniStat label="Истекло" value={m["EXPIRED"] ?? 0} />
              </>
            );
          })()}
        </div>
      </Card>

      {/* Recent audit */}
      <Card className="p-0">
        <div className="px-5 pt-5"><CardTitle>Последние действия</CardTitle></div>
        {recentAudit.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500">Пусто.</p>
        ) : (
          <Table head={
            <tr>
              <th className="px-4 py-2">Действие</th>
              <th className="px-4 py-2">Объект</th>
              <th className="px-4 py-2">Админ</th>
              <th className="px-4 py-2">Дата</th>
            </tr>
          }>
            {recentAudit.map((log) => (
              <tr key={log.id} className="even:bg-zinc-50">
                <td className="px-4 py-2 font-medium text-zinc-900">{log.action}</td>
                <td className="px-4 py-2 text-zinc-500">{log.targetType}:{log.targetId}</td>
                <td className="px-4 py-2 text-zinc-500">{log.user.name || log.user.email}</td>
                <td className="px-4 py-2 text-zinc-400">{log.createdAt.toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Ads */}
      <Card id="ads" className="scroll-mt-20">
        <CardTitle>📢 Реклама</CardTitle>

        <details className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <summary className="cursor-pointer select-none text-sm font-semibold">Создать баннер</summary>
          <form action={createAdvertisementAction} className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Раздел</label>
              <select className={inputCls} name="placement" required>
                {adPlacements.map((placement) => (
                  <option key={placement.value} value={placement.value}>{placement.label} — ${adMonthlyPriceUsd(placement.value)}/мес</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Название</label>
              <input className={inputCls} name="title" maxLength={120} required placeholder="Например: Настройка OBS под ключ" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Короткое описание</label>
              <input className={inputCls} name="description" maxLength={220} placeholder="1 строка под баннером" />
            </div>
            <div>
              <label className={labelCls}>Картинка/GIF URL</label>
              <input className={inputCls} name="imageUrl" type="url" required placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Ссылка перехода</label>
              <input className={inputCls} name="targetUrl" type="url" required placeholder="https://..." />
            </div>
            <div>
              <label className={labelCls}>Старт</label>
              <input className={inputCls} name="startsAt" type="datetime-local" />
            </div>
            <div>
              <label className={labelCls}>Окончание</label>
              <input className={inputCls} name="expiresAt" type="datetime-local" />
            </div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
              Создать рекламу
            </button>
          </form>
        </details>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Активные и архив ({advertisements.length})</p>
        {advertisements.length === 0 && <p className="text-sm text-zinc-500">Рекламы пока нет.</p>}
        <div className="space-y-3">
          {advertisements.map((ad) => (
            <div key={ad.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-900">{ad.title}</p>
                    <Badge color={statusColor(ad.status)}>{ad.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {adPlacementLabel(ad.placement)} • ${adMonthlyPriceUsd(ad.placement)}/мес • клики: {ad.clickCount} • создал {ad.createdBy.name || ad.createdBy.email}
                  </p>
                  {ad.description && <p className="mt-1 text-sm text-zinc-600">{ad.description}</p>}
                  <a className="mt-1 block truncate text-xs text-blue-600" href={ad.targetUrl} target="_blank" rel="noreferrer">{ad.targetUrl}</a>
                </div>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer select-none text-xs font-semibold text-zinc-500">Редактировать размещение</summary>
                <form action={updateAdvertisementAction} className="mt-2 grid gap-2 rounded-lg bg-zinc-50 p-3 md:grid-cols-2">
                  <input type="hidden" name="adId" value={ad.id} />
                  <div>
                    <label className={labelCls}>Место рекламы</label>
                    <select className={inputCls} name="placement" defaultValue={ad.placement} required>
                      {adPlacements.map((placement) => (
                        <option key={placement.value} value={placement.value}>{placement.label} — ${adMonthlyPriceUsd(placement.value)}/мес</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Название</label>
                    <input className={inputCls} name="title" defaultValue={ad.title} maxLength={120} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Описание</label>
                    <input className={inputCls} name="description" defaultValue={ad.description || ""} maxLength={220} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Картинка/GIF именно для этого места</label>
                    <input className={inputCls} name="imageUrl" defaultValue={ad.imageUrl} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Ссылка именно для этого места</label>
                    <input className={inputCls} name="targetUrl" defaultValue={ad.targetUrl} type="url" required />
                  </div>
                  <div>
                    <label className={labelCls}>Старт</label>
                    <input className={inputCls} name="startsAt" type="datetime-local" />
                  </div>
                  <div>
                    <label className={labelCls}>Окончание</label>
                    <input className={inputCls} name="expiresAt" type="datetime-local" />
                  </div>
                  <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white md:col-span-2" type="submit">
                    Сохранить это место рекламы
                  </button>
                </form>
              </details>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={toggleAdvertisementAction}>
                  <input type="hidden" name="adId" value={ad.id} />
                  <input type="hidden" name="status" value={ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE"} />
                  <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white" type="submit">
                    {ad.status === "ACTIVE" ? "Пауза" : "Активировать"}
                  </button>
                </form>
                <form action={toggleAdvertisementAction}>
                  <input type="hidden" name="adId" value={ad.id} />
                  <input type="hidden" name="status" value="ARCHIVED" />
                  <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white" type="submit">В архив</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reviews */}
      <Card>
        <CardTitle>Отзывы на услуги ({listingReviews.length})</CardTitle>
        {listingReviews.length === 0 && <p className="text-sm text-zinc-500">Отзывов пока нет.</p>}
        <div className="space-y-2">
          {listingReviews.map((review) => (
            <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">
                  {review.parentId ? "Ответ" : `Оценка ${review.rating || "-"} из 5`} • {review.listing.title}
                </p>
                <p className="text-xs text-zinc-500">{review.body} • от {review.user.email || review.user.name}</p>
              </div>
              <form action={deleteListingReviewAction}>
                <input type="hidden" name="reviewId" value={review.id} />
                <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white" type="submit">Удалить</button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      {/* Payments */}
      <Card>
        <CardTitle>Платежи — PENDING ({pendingPayments.length})</CardTitle>
        {pendingPayments.length === 0 && <p className="text-sm text-zinc-500">Нет платежей в очереди.</p>}
        <div className="space-y-2">
          {pendingPayments.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{payment.type} • ${payment.amountUsd.toString()} • ref: {payment.referenceType}:{payment.referenceId}</p>
                <p className="text-xs text-zinc-500">TX: {payment.txHash || "-"}</p>
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
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{String(value)}</p>
    </div>
  );
}
