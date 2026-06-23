import { ReactNode } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/access";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["ADMIN", "MODERATOR"]);
  const isAdmin = user.role === "ADMIN";

  const links: { href: string; label: string; adminOnly?: boolean }[] = [
    { href: "/admin", label: "Дашборд", adminOnly: true },
    { href: "/admin/users", label: "Пользователи", adminOnly: true },
    { href: "/admin/content", label: "Контент" },
    { href: "/admin/reports", label: "Жалобы" },
    { href: "/admin/audit", label: "Аудит-лог", adminOnly: true },
    { href: "/admin/balance", label: "Баланс", adminOnly: true },
  ];

  const visibleLinks = links.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="md:flex md:gap-6">
      <nav className="mb-4 overflow-x-auto md:mb-0 md:w-48 md:shrink-0">
        <div className="flex gap-1 md:flex-col md:gap-0">
          {visibleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
