import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false }
};

export default function ForgotPasswordPage({ searchParams }: { searchParams?: { sent?: string } }) {
  const sent = searchParams?.sent === "1";

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Восстановление пароля</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Введите email аккаунта. Если такой пользователь есть, мы отправим ссылку для сброса пароля на 30 минут.
      </p>
      {sent && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Если email найден, письмо уже отправлено. Проверьте почту и папку спам.
        </p>
      )}
      <form action={requestPasswordResetAction} className="mt-4 space-y-3">
        <input className="w-full rounded border p-2" name="email" type="email" placeholder="Email" required />
        <button className="w-full rounded bg-ink p-2 text-white" type="submit">Отправить ссылку</button>
      </form>
      <Link className="mt-4 inline-flex text-sm font-medium text-accent" href="/auth/signin">
        Вернуться ко входу
      </Link>
    </div>
  );
}
