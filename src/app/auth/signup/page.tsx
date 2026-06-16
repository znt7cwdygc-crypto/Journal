import type { Metadata } from "next";
import { registerAction } from "@/app/actions";

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
        <input className="w-full rounded border p-2" name="password" type="password" placeholder="Пароль (минимум 6)" required />
        <select className="w-full rounded border p-2" name="accountMode" defaultValue="CONSUMER">
          <option value="CONSUMER">Ищу услуги / работу</option>
          <option value="PROVIDER">Предлагаю услуги / вакансии</option>
          <option value="BOTH">Ищу и предлагаю</option>
        </select>
        <select className="w-full rounded border p-2" name="profileKind" defaultValue="MODEL">
          <option value="MODEL">Модель</option>
          <option value="OPERATOR">Оператор</option>
          <option value="STUDIO">Студия</option>
          <option value="AGENCY">Агентство</option>
          <option value="EXPERT">Эксперт</option>
          <option value="COACH">Коуч</option>
          <option value="LAWYER">Юрист</option>
          <option value="OTHER">Другое</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input name="adult" type="checkbox" required />
          Подтверждаю, что мне 18+
        </label>
        <button className="w-full rounded bg-ink p-2 text-white" type="submit">Создать аккаунт</button>
      </form>
    </div>
  );
}
