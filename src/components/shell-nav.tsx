import Link from "next/link";

const menuGroups = [
  {
    title: "Контент",
    links: [
      ["Лента", "/articles"],
      ["Гайды", "/guides"]
    ]
  },
  {
    title: "Работа и услуги",
    links: [
      ["Вакансии", "/vacancies"],
      ["Резюме", "/resumes"],
      ["Услуги", "/services"],
      ["Товары", "/products"],
      ["Модель оператор", "/model-operator"]
    ]
  },
  {
    title: "Справка",
    links: [
      ["Авторы", "/authors"],
      ["Полезные ссылки", "/links"]
    ]
  }
] as const;

export function ShellNav() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <nav>
          {menuGroups.map((group, index) => (
            <section key={group.title} className={index > 0 ? "border-t border-zinc-200" : undefined}>
              <p className="px-5 pt-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {group.title}
              </p>
              <div className="px-3 py-2.5">
                {group.links.map(([label, href]) => (
                  <Link
                    key={`${label}-${href}`}
                    href={href}
                    className="block rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Публикация</p>
          <Link href="/cabinet" className="mt-3 block rounded-xl bg-ink px-3 py-2.5 text-center text-sm font-semibold text-white">
            Написать
          </Link>
        </div>
      </div>
    </aside>
  );
}
