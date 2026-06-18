"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Главная", "/"],
  ["Лента", "/articles"],
  ["Написать", "/cabinet"],
  ["Связки", "/model-operator"],
  ["Кабинет", "/cabinet"]
] as const;

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map(([label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const publish = label === "Написать";

          return (
            <Link
              key={`${label}-${href}`}
              href={href}
              className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-[11px] font-semibold leading-tight ${
                publish
                  ? "bg-hot text-white shadow-sm shadow-red-200"
                  : active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
