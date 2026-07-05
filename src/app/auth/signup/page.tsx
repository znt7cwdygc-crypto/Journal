import type { Metadata } from "next";
import { registerAction } from "@/app/actions";
import { PasswordInput } from "@/components/password-input";
import { roleOptions } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Регистрация",
  robots: { index: false, follow: false }
};

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      <form action={registerAction} className="mt-4 space-y-3">
        <input className="w-full rounded border p-2" name="name" placeholder="Имя" required />
        <input className="w-full rounded border p-2" name="email" type="email" placeholder="Email" required />
        <PasswordInput className="w-full rounded border p-2" name="password" placeholder="Пароль (минимум 6)" required />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-600">Кто вы?</label>
          <select className="w-full rounded border p-2" name="profileKind" defaultValue="MODEL">
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="adult" type="checkbox" required />
          Подтверждаю, что мне 18+
        </label>
        <button className="w-full rounded bg-ink p-2 text-white" type="submit">Создать аккаунт</button>
      </form>
    </div>
  );
}
