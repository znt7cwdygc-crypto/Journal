import type { Metadata } from "next";
import { createAdvertisementAction, toggleAdvertisementAction, updateAdvertisementAction } from "@/app/actions";
import { adMonthlyPriceUsd, adPlacementLabel, adPlacements } from "@/lib/ads";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardTitle, statusColor } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Реклама",
  robots: { index: false, follow: false },
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm";
const labelCls = "block text-xs font-semibold text-zinc-500";

export default async function AdsPage() {
  await requireRole(["ADMIN"]);

  const advertisements = await prisma.advertisement.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Реклама</h1>
        <p className="text-sm text-zinc-500">Управление рекламными баннерами</p>
      </div>

      <Card>
        <CardTitle>Создать баннер</CardTitle>
        <form action={createAdvertisementAction} className="grid gap-3 md:grid-cols-2">
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
      </Card>

      <Card>
        <CardTitle>Активные и архив ({advertisements.length})</CardTitle>
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
    </div>
  );
}
