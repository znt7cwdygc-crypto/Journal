import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false, follow: false }
};

export default function SignInPage({ searchParams }: { searchParams?: { error?: string; passwordReset?: string } }) {
  const hasCredentialsError = searchParams?.error === "credentials";
  const passwordReset = searchParams?.passwordReset === "1";

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Вход</h1>
      {passwordReset && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Пароль обновлен. Теперь можно войти с новым паролем.
        </p>
      )}
      {hasCredentialsError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не удалось войти. Проверьте email и пароль.
        </p>
      )}
      <form action={loginAction} className="mt-4 space-y-3">
        <input className="w-full rounded border p-2" name="email" type="email" placeholder="Email" required />
        <input className="w-full rounded border p-2" name="password" type="password" placeholder="Пароль" required />
        <button className="w-full rounded bg-ink p-2 text-white" type="submit">Войти</button>
      </form>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <Link className="font-medium text-accent" href="/auth/forgot-password">Забыли пароль?</Link>
        <Link className="text-zinc-500 hover:text-ink" href="/auth/signup">Регистрация</Link>
      </div>
    </div>
  );
}
