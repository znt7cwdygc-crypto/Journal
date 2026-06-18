import Link from "next/link";

const menu = [
  ["Лента", "/articles"],
  ["Гайды", "/guides/rabota-webcam-bez-opyta"],
  ["Авторы", "/authors"],
  ["Вакансии", "/vacancies"],
  ["Резюме", "/resumes"],
  ["Модель оператор", "/model-operator"],
  ["Услуги", "/services"],
  ["Товары", "/products"],
  ["Полезные ссылки", "/links"]
] as const;

export function ShellNav() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 border border-zinc-200 bg-white p-3">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Разделы</p>
        <nav className="space-y-1">
          {menu.map(([label, href]) => (
            <Link key={`${label}-${href}`} href={href} className="block rounded-lg px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-zinc-100 px-2 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Публикация</p>
          <Link href="/cabinet" className="mt-2 block rounded-lg bg-ink px-3 py-2 text-center text-sm font-medium text-white">
            Написать
          </Link>
        </div>
      </div>
    </aside>
  );
}
