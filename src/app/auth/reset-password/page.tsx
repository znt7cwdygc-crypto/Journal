import type { Metadata } from "next";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Новый пароль",
  robots: { index: false, follow: false }
};

const errorMessages: Record<string, string> = {
  token: "Ссылка недействительна или уже использована.",
  expired: "Срок действия ссылки истек. Запросите новое письмо.",
  password: "Пароли должны совпадать и быть не короче 6 символов."
};

export default async function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string; error?: string } }) {
  const token = searchParams?.token || "";
  const error = searchParams?.error ? errorMessages[searchParams.error] : "";
  const record = token ? await prisma.verificationToken.findUnique({ where: { token } }) : null;
  const valid = Boolean(record && record.identifier.startsWith("password-reset:") && record.expires > new Date());

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Новый пароль</h1>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!valid ? (
        <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
          <p>Ссылка недействительна или срок действия уже истек.</p>
          <Link className="inline-flex rounded-lg bg-ink px-4 py-2 font-semibold text-white" href="/auth/forgot-password">
            Запросить новую ссылку
          </Link>
        </div>
      ) : (
        <form action={resetPasswordAction} className="mt-4 space-y-3">
          <input type="hidden" name="token" value={token} />
          <input className="w-full rounded border p-2" name="password" type="password" placeholder="Новый пароль" minLength={6} required />
          <input className="w-full rounded border p-2" name="passwordConfirm" type="password" placeholder="Повторите пароль" minLength={6} required />
          <button className="w-full rounded bg-ink p-2 text-white" type="submit">Сохранить пароль</button>
        </form>
      )}
    </div>
  );
}
