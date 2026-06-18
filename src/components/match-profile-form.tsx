"use client";

import { useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type MatchProfileDraft = {
  seekerRole: string;
  lookingFor: string;
  title: string;
  city: string | null;
  timezone: string | null;
  experience: string;
  schedule: string;
  operatorPercent: string | null;
  currentCheck: string | null;
  niche: string | null;
  workFormat: string;
  bio: string;
  contact: string;
};

const steps = ["Роль", "Опыт", "График", "Деньги", "Ниша", "Контакт"];
const cities = ["Удаленно", "Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Минск", "Другой город"];
const timezones = ["MSK", "UTC+2", "UTC+3", "UTC+4", "UTC+5", "UTC+6", "Другое"];
const experienceOptions = ["Без опыта", "До 6 месяцев", "6-12 месяцев", "1-2 года", "2+ года"];
const scheduleOptions = ["Утро", "День", "Вечер", "Ночь", "Сменный", "По договоренности"];
const formatOptions = [
  ["REMOTE", "Удаленно"],
  ["OFFICE", "В студии"],
  ["HYBRID", "Гибрид"]
] as const;
const roleLabels: Record<string, string> = { MODEL: "Модель", OPERATOR: "Оператор", BOTH: "Любой вариант" };

function radioClass() {
  return "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-hot hover:bg-red-50 has-[:checked]:border-hot has-[:checked]:bg-red-50";
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm" />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="min-h-28 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-6" />;
}

export function MatchProfileForm({
  action,
  profile,
  profileKind
}: {
  action: (formData: FormData) => void | Promise<void>;
  profile?: Partial<MatchProfileDraft> | null;
  profileKind: string;
}) {
  const [step, setStep] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const isLast = step === steps.length - 1;
  const defaultRole = profile?.seekerRole || (profileKind === "OPERATOR" ? "OPERATOR" : "MODEL");
  const defaultLookingFor = profile?.lookingFor || (defaultRole === "MODEL" ? "OPERATOR" : "MODEL");
  const progress = Math.round(((step + 1) / steps.length) * 100);

  function canLeaveCurrentStep() {
    const activeStep = rootRef.current?.querySelector('[data-active="true"]');
    const controls = activeStep?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    if (!controls) return true;

    for (const control of Array.from(controls)) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !canLeaveCurrentStep()) return;
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  return (
    <section ref={rootRef} className="quiz-shell" data-quiz-root>
      <div className="quiz-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Модель оператор</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Анкета для связки</h2>
            <p className="mt-1 hidden text-xs leading-5 text-zinc-600 sm:block">Публикация бесплатная на 14 дней.</p>
          </div>
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">14 дней</span>
        </div>
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Шаг {step + 1} из {steps.length}: {steps[step]}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <form action={action} className="quiz-body">
        <div data-active={step === 0 ? "true" : undefined} className={step === 0 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Роль</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">Кто вы и кого ищете?</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {["MODEL", "OPERATOR"].map((role) => (
              <label key={role} className={radioClass()}>
                <input className="accent-hot" type="radio" name="seekerRole" value={role} defaultChecked={defaultRole === role} />
                <span>{roleLabels[role]}</span>
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["MODEL", "OPERATOR", "BOTH"].map((role) => (
              <label key={role} className={radioClass()}>
                <input className="accent-hot" type="radio" name="lookingFor" value={role} defaultChecked={defaultLookingFor === role} />
                <span>Ищу: {roleLabels[role]}</span>
              </label>
            ))}
          </div>
          <TextInput name="title" defaultValue={profile?.title || ""} placeholder="Например: модель ищет оператора на вечерние смены" required />
        </div>

        <div data-active={step === 1 ? "true" : undefined} className={step === 1 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <h3 className="text-lg font-semibold text-ink">Опыт и формат работы</h3>
          <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold" name="experience" defaultValue={profile?.experience || "6-12 месяцев"} required>
            {experienceOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="grid gap-2 sm:grid-cols-3">
            {formatOptions.map(([value, label]) => (
              <label key={value} className={radioClass()}>
                <input className="accent-hot" type="radio" name="workFormat" value={value} defaultChecked={(profile?.workFormat || "REMOTE") === value} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div data-active={step === 2 ? "true" : undefined} className={step === 2 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <h3 className="text-lg font-semibold text-ink">Город, график и часовой пояс</h3>
          <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold" name="city" defaultValue={profile?.city || "Удаленно"}>
            {cities.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold" name="schedule" defaultValue={profile?.schedule || "Вечер"} required>
            {scheduleOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold" name="timezone" defaultValue={profile?.timezone || "MSK"}>
            {timezones.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div data-active={step === 3 ? "true" : undefined} className={step === 3 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <h3 className="text-lg font-semibold text-ink">Деньги и ожидания</h3>
          <TextInput name="operatorPercent" defaultValue={profile?.operatorPercent || ""} placeholder="Процент оператору от тотала, например 20%" />
          <TextInput name="currentCheck" defaultValue={profile?.currentCheck || ""} placeholder="Текущий чек/результат, например $800 в месяц" />
        </div>

        <div data-active={step === 4 ? "true" : undefined} className={step === 4 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <h3 className="text-lg font-semibold text-ink">Ниша и опыт</h3>
          <TextInput name="niche" defaultValue={profile?.niche || ""} placeholder="Ниша: соло, парные, фетиш, премиум, soft и т.д." />
          <TextArea name="bio" defaultValue={profile?.bio || ""} placeholder="Коротко: с чем работали, что ищете, какой стиль общения, что важно в связке." required />
        </div>

        <div data-active={step === 5 ? "true" : undefined} className={step === 5 ? "min-h-0 flex-1 space-y-3" : "hidden"}>
          <h3 className="text-lg font-semibold text-ink">Контакт</h3>
          <TextInput name="contact" defaultValue={profile?.contact || ""} placeholder="Telegram или email для связи" required />
          <p className="text-xs leading-5 text-zinc-500">Контакт видят зарегистрированные пользователи.</p>
        </div>

        <div className="quiz-footer">
          <button className="quiz-back" type="button" disabled={step === 0} onClick={(event) => {
            event.preventDefault();
            goToStep(step - 1);
          }}>
            Назад
          </button>
          {!isLast ? (
            <button className="quiz-next" type="button" onClick={(event) => {
              event.preventDefault();
              goToStep(step + 1);
            }}>
              Далее
            </button>
          ) : (
            <FormSubmitButton className="quiz-next" pendingText="Публикуем...">
              Опубликовать
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}
