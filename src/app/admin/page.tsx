import type { Metadata } from "next";
import { createAdvertisementAction, deleteListingReviewAction, reviewPaymentAction, reviewReportAction, toggleAdvertisementAction, topUpBalanceAction, updateAdvertisementAction } from "@/app/actions";
import { adMonthlyPriceUsd, adPlacementLabel, adPlacements } from "@/lib/ads";
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

  const [pendingPayments, pendingArticles, pendingListings, reports, listingReviews, providerUsers, recentTransactions, advertisements] = await Promise.all([
    prisma.payment.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.article.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" } }),
    prisma.listing.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "asc" } }),
    prisma.report.findMany({ where: { status: "PENDING_REVIEW" }, include: { reporter: true }, orderBy: { createdAt: "asc" } }),
    prisma.listingReview.findMany({
      where: { listing: { type: "SERVICE" } },
      include: { listing: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 30
    }),
    prisma.user.findMany({
      where: { accountMode: { in: ["PROVIDER", "BOTH"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    }),
    prisma.balanceTransaction.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.advertisement.findMany({
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 30
    }).catch(() => [])
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Админ-панель</h1>

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

      <TreeRoot title="Пополнение баланса студий">
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
        <TreeBranch label={`Последние транзакции (${recentTransactions.length})`}>
          {recentTransactions.length === 0 && <p className="text-sm text-zinc-500">Транзакций пока нет.</p>}
          {recentTransactions.map((tx) => (
            <TreeLeaf key={tx.id}>
              <p>{tx.type} • ${(tx.amountCents / 100).toFixed(2)} • {tx.user.name || tx.user.email}</p>
              <p className="text-xs text-zinc-500">{tx.note || "-"} • {tx.createdAt.toLocaleDateString("ru-RU")}</p>
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
