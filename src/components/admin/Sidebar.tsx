"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavItem =
  | {
      href: string;
      label: string;
      icon: string;
      badge?: number;
    }
  | {
      section: string;
    };

function isSection(item: AdminNavItem): item is { section: string } {
  return "section" in item;
}

export function AdminShell({
  items,
  userName,
  children,
}: {
  items: AdminNavItem[];
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/admin") return pathname === "/admin";
    return pathname.startsWith(base);
  };

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {items.map((item, i) => {
        if (isSection(item)) {
          return (
            <p
              key={`section-${i}`}
              className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 first:mt-0"
            >
              {item.section}
            </p>
          );
        }
        const active = isActive(item.href);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 md:flex">
        <div className="flex h-14 items-center border-b border-zinc-800 px-5">
          <span className="text-base font-bold tracking-tight text-white">WE Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-zinc-900">
            <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
              <span className="text-base font-bold text-white">WE Admin</span>
              <button onClick={() => setOpen(false)} className="text-zinc-400" aria-label="Закрыть">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 md:hidden"
            aria-label="Меню"
          >
            ☰
          </button>
          <span className="font-semibold text-zinc-900 md:hidden">WE Admin</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-600 sm:inline">{userName}</span>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              ← Назад на сайт
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
