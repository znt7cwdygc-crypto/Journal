import type { Metadata } from "next";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, StatCard, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Дашборд",
  robots: { index: false, follow: false },
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
    activeReports,
    articlesCount,
    listingsCount,
    productsCount,
    resumesCount,
    inviteStats,
    inviteRevenue,
    recentAudit,
    pendingPayments,
    expiredInvites,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.report.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.listing.count(),
    prisma.product.count(),
    prisma.resume.count(),
    prisma.invite.groupBy({ by: ["status"], _count: true }),
    prisma.balanceTransaction.aggregate({ where: { type: "CHARGE" }, _sum: { amountCents: true } }),
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.invite.count({ where: { status: "EXPIRED" } }),
  ]);

  const inviteMap = Object.fromEntries(inviteStats.map((s) => [s.status, s._count]));
  const inviteRevenueUsd = ((inviteRevenue._sum.amountCents ?? 0) / 100).toFixed(2);
  const acceptedInvites = inviteMap["ACCEPTED"] ?? 0;
  const totalInvites = inviteStats.reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Дашборд</h1>
        <p className="text-sm text-zinc-500">Обзор платформы MyCamDesk</p>
      </div>

      {/* Row 1: Users + reports */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="👥" accent="blue" value={totalUsers} label="Пользователи" />
        <StatCard icon="📈" accent="blue" value={newUsersWeek} label="Новые за неделю" />
        <StatCard icon="📅" accent="blue" value={newUsersMonth} label="Новые за месяц" />
        <StatCard icon="⚠️" accent="red" value={activeReports} label="Активные жалобы" />
      </div>

      {/* Row 2: Content */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="📝" accent="green" value={articlesCount} label="Статьи" />
        <StatCard icon="📂" accent="purple" value={listingsCount} label="Объявления" />
        <StatCard icon="🛒" accent="amber" value={productsCount} label="Товары" />
        <StatCard icon="📄" accent="zinc" value={resumesCount} label="Резюме" />
      </div>

      {/* Row 3: Invites revenue */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="💵" accent="green" value={`$${inviteRevenueUsd}`} label="Доход от инвайтов" />
        <StatCard icon="🎟️" accent="purple" value={`${acceptedInvites}/${totalInvites}`} label="Инвайты (принято/всего)" />
      </div>

      {/* Требует внимания */}
      <Card>
        <CardTitle>Требует внимания</CardTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AlertCard count={activeReports} label="Жалоб ожидают рассмотрения" href="/admin/reports" color="red" />
          <AlertCard count={pendingPayments} label="Платежей ожидают подтверждения" href="/admin/payments" color="amber" />
          <AlertCard count={expiredInvites} label="Инвайтов истекло" href="/admin/invites" color="zinc" />
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
    </div>
  );
}

function AlertCard({ count, label, href, color }: { count: number; label: string; href: string; color: string }) {
  const colorMap: Record<string, string> = {
    red: "border-l-red-500 bg-red-50",
    amber: "border-l-amber-500 bg-amber-50",
    zinc: "border-l-zinc-400 bg-zinc-50",
  };
  return (
    <a href={href} className={`block rounded-lg border border-l-4 p-4 transition hover:shadow-md ${colorMap[color] ?? colorMap.zinc}`}>
      <p className="text-2xl font-bold text-zinc-900">{count}</p>
      <p className="mt-1 text-xs text-zinc-600">{label}</p>
    </a>
  );
}
