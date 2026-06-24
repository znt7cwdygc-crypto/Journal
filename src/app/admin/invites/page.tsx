import type { Metadata } from "next";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardTitle, StatCard, Table, statusColor } from "@/components/admin/ui";
import type { InviteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Инвайты",
  robots: { index: false, follow: false },
};

const validStatuses: Record<string, InviteStatus> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  declined: "DECLINED",
  expired: "EXPIRED",
};

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["ADMIN"]);

  const params = await searchParams;
  const filterStatus = params.status || "all";

  const prismaStatus = validStatuses[filterStatus];
  const where = prismaStatus ? { status: prismaStatus } : {};

  const [invites, revenue, stats] = await Promise.all([
    prisma.invite.findMany({
      where,
      include: {
        studio: { select: { name: true, email: true } },
        resume: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.balanceTransaction.aggregate({ where: { type: "CHARGE" }, _sum: { amountCents: true } }),
    prisma.invite.groupBy({ by: ["status"], _count: true }),
  ]);

  const revenueUsd = ((revenue._sum.amountCents ?? 0) / 100).toFixed(2);
  const statsMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  const tabs = [
    { key: "all", label: "Все" },
    { key: "pending", label: "Ожидают" },
    { key: "accepted", label: "Принятые" },
    { key: "declined", label: "Отклонённые" },
    { key: "expired", label: "Истёкшие" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Инвайты</h1>
        <p className="text-sm text-zinc-500">Все инвайты платформы</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="💵" accent="green" value={`$${revenueUsd}`} label="Общий доход" />
        <StatCard icon="📩" accent="blue" value={statsMap["PENDING"] ?? 0} label="Ожидают" />
        <StatCard icon="✅" accent="green" value={statsMap["ACCEPTED"] ?? 0} label="Принятые" />
        <StatCard icon="❌" accent="red" value={(statsMap["DECLINED"] ?? 0) + (statsMap["EXPIRED"] ?? 0)} label="Отклонённые + Истёкшие" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={tab.key === "all" ? "/admin/invites" : `/admin/invites?status=${tab.key}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filterStatus === tab.key
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <Card className="p-0">
        <div className="px-5 pt-5"><CardTitle>Инвайты ({invites.length})</CardTitle></div>
        {invites.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500">Нет инвайтов.</p>
        ) : (
          <Table head={
            <tr>
              <th className="px-4 py-2">Дата</th>
              <th className="px-4 py-2">Студия</th>
              <th className="px-4 py-2">Резюме</th>
              <th className="px-4 py-2">Сумма</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">Причина отклонения</th>
            </tr>
          }>
            {invites.map((invite) => (
              <tr key={invite.id} className="even:bg-zinc-50">
                <td className="px-4 py-2 text-zinc-500">{invite.createdAt.toLocaleDateString("ru-RU")}</td>
                <td className="px-4 py-2 font-medium text-zinc-900">{invite.studio.name || invite.studio.email}</td>
                <td className="px-4 py-2 text-zinc-700">{invite.resume.title}</td>
                <td className="px-4 py-2 text-zinc-700">${invite.amountUsd}</td>
                <td className="px-4 py-2"><Badge color={statusColor(invite.status)}>{invite.status}</Badge></td>
                <td className="px-4 py-2 text-xs text-zinc-500">{invite.declineReason || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
