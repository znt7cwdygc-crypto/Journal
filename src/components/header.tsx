import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="h-1 bg-[linear-gradient(90deg,#ff4d2e_0%,#ffd84d_36%,#38bdf8_70%,#0f766e_100%)]" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight text-ink sm:text-lg">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-hot text-sm font-black text-white">M</span>
            <span className="truncate">CamDesk</span>
          </Link>
          <form className="hidden lg:block" action="/search">
            <input
              name="q"
              className="w-72 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-zinc-400"
              placeholder="Поиск по статьям, авторам, темам"
            />
          </form>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {session?.user ? (
            <div className="flex items-center gap-1 text-xs sm:gap-2">
              <span className="hidden lg:inline text-zinc-600">{session.user.email}</span>
              <Link className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" href="/cabinet">
                Кабинет
              </Link>
              <form action={logoutAction}>
                <button className="rounded-lg bg-zinc-900 px-2 py-1.5 text-xs text-white" type="submit">
                  Выйти
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <Link className="rounded-lg border border-zinc-200 px-2 py-1.5" href="/auth/signin">Вход</Link>
              <Link className="rounded-lg bg-hot px-2.5 py-1.5 font-medium text-white shadow-sm shadow-red-200 hover:bg-red-600" href="/auth/signup">
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto border-t border-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-600 lg:hidden">
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/articles">Лента</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/vacancies">Вакансии</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/resumes">Резюме</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/services">Услуги</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/products">Товары</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/model-operator">Связки</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/guides">Гайды</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/links">Ссылки</Link>
        <Link className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5" href="/authors">Авторы</Link>
      </nav>
    </header>
  );
}
