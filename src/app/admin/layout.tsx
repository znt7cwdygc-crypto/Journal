import { ReactNode } from "react";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AdminShell, type AdminNavItem } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["ADMIN", "MODERATOR"]);
  const isAdmin = user.role === "ADMIN";

  const pendingReports = await prisma.report.count({ where: { status: "PENDING_REVIEW" } });

  const all: (AdminNavItem & { adminOnly?: boolean })[] = [
    { href: "/admin", label: "Дашборд", icon: "📊", adminOnly: true },
    { href: "/admin/users", label: "Пользователи", icon: "👥", adminOnly: true },
    { href: "/admin/content", label: "Контент", icon: "📝" },
    { href: "/admin/reports", label: "Жалобы", icon: "⚠️", badge: pendingReports || undefined },
    { href: "/admin/audit", label: "Аудит-лог", icon: "📋", adminOnly: true },
    { href: "/admin/balance", label: "Баланс", icon: "💰", adminOnly: true },
    { href: "/admin#ads", label: "Реклама", icon: "📢", adminOnly: true },
  ];

  const items: AdminNavItem[] = all
    .filter((l) => !l.adminOnly || isAdmin)
    .map(({ adminOnly: _adminOnly, ...item }) => item);

  return (
    <AdminShell items={items} userName={user.name || user.email || "Админ"}>
      {children}
    </AdminShell>
  );
}
