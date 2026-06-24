import { ReactNode } from "react";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AdminShell, type AdminNavItem } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["ADMIN", "MODERATOR"]);
  const isAdmin = user.role === "ADMIN";

  const pendingReports = await prisma.report.count({ where: { status: "PENDING_REVIEW" } });

  type NavEntry = AdminNavItem & { adminOnly?: boolean };

  const all: NavEntry[] = [
    { section: "ОБЗОР" },
    { href: "/admin", label: "Дашборд", icon: "📊", adminOnly: true },

    { section: "МОДЕРАЦИЯ" },
    { href: "/admin/reports", label: "Жалобы", icon: "⚠️", badge: pendingReports || undefined },
    { href: "/admin/content", label: "Контент", icon: "📝" },

    { section: "ПОЛЬЗОВАТЕЛИ" },
    { href: "/admin/users", label: "Пользователи", icon: "👥", adminOnly: true },

    { section: "ФИНАНСЫ" },
    { href: "/admin/balance", label: "Баланс", icon: "💰", adminOnly: true },
    { href: "/admin/invites", label: "Инвайты", icon: "🎟️", adminOnly: true },

    { section: "МАРКЕТИНГ" },
    { href: "/admin/ads", label: "Реклама", icon: "📢", adminOnly: true },
    { href: "/admin/reviews", label: "Отзывы", icon: "💬" },

    { section: "СИСТЕМА" },
    { href: "/admin/audit", label: "Аудит-лог", icon: "📋", adminOnly: true },
    { href: "/admin/payments", label: "Платежи", icon: "⚙️", adminOnly: true },
  ];

  const items: AdminNavItem[] = all
    .filter((entry) => !("adminOnly" in entry) || !entry.adminOnly || isAdmin)
    .map(({ adminOnly: _adminOnly, ...item }) => item as AdminNavItem);

  return (
    <AdminShell items={items} userName={user.name || user.email || "Админ"}>
      {children}
    </AdminShell>
  );
}
