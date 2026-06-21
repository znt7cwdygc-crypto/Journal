"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const createItems = [
  ["Написать статью", "/cabinet#blog"],
  ["Разместить резюме", "/cabinet#resume"],
  ["Разместить вакансию", "/cabinet#vacancy"],
  ["Предложить услугу", "/cabinet#service"],
  ["Продать товар", "/cabinet#products"],
  ["Найти модель/оператора", "/cabinet#match"]
] as const;

const workItems = [
  ["Вакансии", "/vacancies"],
  ["Резюме", "/resumes"],
  ["Услуги", "/services"],
  ["Товары", "/products"],
  ["Модель оператор", "/model-operator"]
] as const;

const workPaths = workItems.map(([, href]) => href);

function isPathActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function QuickMenu({
  title,
  items,
  onClose
}: {
  title: string;
  items: readonly (readonly [string, string])[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+max(env(safe-area-inset-bottom),0rem))] z-50 rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_16px_44px_rgba(24,24,27,0.18)] lg:hidden">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(([label, href]) => (
          <Link key={`${label}-${href}`} href={href} onClick={onClose} className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm font-semibold leading-tight text-ink hover:bg-zinc-100">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const [openMenu, setOpenMenu] = useState<"create" | "work" | null>(null);
  const workActive = workPaths.some((href) => isPathActive(pathname, href));

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  return (
    <>
      {openMenu && <button aria-label="Закрыть меню" className="fixed inset-0 z-40 bg-black/10 lg:hidden" type="button" onClick={() => setOpenMenu(null)} />}

      {openMenu === "create" && <QuickMenu title="Создать" items={createItems} onClose={() => setOpenMenu(null)} />}
      {openMenu === "work" && <QuickMenu title="Работа" items={workItems} onClose={() => setOpenMenu(null)} />}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <Link
            href="/"
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight ${
              pathname === "/" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Главная
          </Link>
          <Link
            href="/articles"
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight ${
              isPathActive(pathname, "/articles") ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Лента
          </Link>
          <button
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight shadow-sm shadow-red-200 ${
              openMenu === "create" ? "bg-zinc-900 text-white" : "bg-hot text-white"
            }`}
            type="button"
            aria-expanded={openMenu === "create"}
            onClick={() => setOpenMenu((value) => (value === "create" ? null : "create"))}
          >
            Создать
          </button>
          <button
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight ${
              openMenu === "work" || workActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
            type="button"
            aria-expanded={openMenu === "work"}
            onClick={() => setOpenMenu((value) => (value === "work" ? null : "work"))}
          >
            Работа
          </button>
          <Link
            href="/cabinet"
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight ${
              isPathActive(pathname, "/cabinet") ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Кабинет
          </Link>
        </div>
      </nav>
    </>
  );
}
