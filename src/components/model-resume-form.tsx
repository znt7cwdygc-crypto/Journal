"use client";

import { useMemo, useRef, useState } from "react";
import { resumeQuizOptions, resumeQuizSteps } from "@/lib/quizzes/resume-quiz";

type ResumeDraft = {
  title: string;
  roleGoal: string;
  city: string | null;
  experienceMonths: number;
  contactEmail: string | null;
  contactTelegram: string | null;
};

type ModelResumeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  resume?: Partial<ResumeDraft> | null;
};

function normalizeCity(value: string | null | undefined) {
  const city = String(value || "").toLowerCase();
  return resumeQuizOptions.cities.find((option) => city.includes(option.toLowerCase())) || "Москва";
}

function ChoiceGrid({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-zinc-700 transition hover:border-hot hover:bg-red-50 has-[:checked]:border-hot has-[:checked]:bg-red-50 sm:min-h-10 sm:text-sm"
        >
          <input className="h-3.5 w-3.5 shrink-0 accent-hot" type="checkbox" name={name} value={option} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function RadioGrid({
  name,
  options,
  defaultValue,
  columns = "sm:grid-cols-2"
}: {
  name: string;
  options: Array<string | [string, string]>;
  defaultValue?: string;
  columns?: string;
}) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const value = Array.isArray(option) ? option[0] : option;
        const label = Array.isArray(option) ? option[1] : option;

        return (
          <label
            key={value}
            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-zinc-700 transition hover:border-hot hover:bg-red-50 has-[:checked]:border-hot has-[:checked]:bg-red-50 sm:min-h-10 sm:text-sm"
          >
            <input className="h-3.5 w-3.5 shrink-0 accent-hot" type="radio" name={name} value={value} defaultChecked={defaultValue === value} />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function QuizQuestion({
  eyebrow,
  title,
  hint,
  children
}: {
  eyebrow: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold leading-tight text-ink sm:text-xl">{title}</h3>
        <p className="mt-1 line-clamp-2 max-w-2xl text-xs leading-5 text-zinc-600 sm:text-sm">{hint}</p>
      </div>
      <div className="quiz-content">{children}</div>
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">{children}</p>;
}

export function ModelResumeForm({ action, resume }: ModelResumeFormProps) {
  const [step, setStep] = useState(0);
  const [about, setAbout] = useState("");
  const quizRef = useRef<HTMLElement | null>(null);
  const title = resume?.title || "Резюме вебкам-модели";
  const city = normalizeCity(resume?.city);
  const steps = resumeQuizSteps;
  const lastStep = step === steps.length - 1;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const stepsPayload = JSON.stringify(steps);

  const preview = useMemo(
    () =>
      about.trim() ||
      "Заполните короткий блок о себе. Остальные ответы сайт соберет в структурированное резюме автоматически.",
    [about]
  );

  function goToStep(nextStep: number) {
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => {
      quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  return (
    <section ref={quizRef} className="quiz-shell" data-quiz-root data-quiz-step-current="0" data-quiz-steps={stepsPayload}>
      <div className="quiz-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Квиз-анкета</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Резюме модели</h2>
            <p className="mt-1 hidden max-w-2xl text-xs leading-5 text-zinc-600 sm:block sm:text-sm">
              Отвечайте по блокам. В конце сайт сам соберет понятное резюме для студии.
            </p>
          </div>
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">для матчинга</span>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>
              Шаг <span data-quiz-current>1</span> из {steps.length}: <span data-quiz-title>{steps[0]}</span>
            </span>
            <span data-quiz-progress>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-hot transition-all" data-quiz-progress-bar style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <form action={action} className="quiz-body">
        <input type="hidden" name="resumeTemplate" value="model-v1" />
        <input type="hidden" name="roleGoal" value="Модель" />

        <div data-quiz-step="0" className={step === 0 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Старт"
            title="Как назвать резюме и где показывать?"
            hint="Город нужен для каталога резюме."
          >
            <input className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm" name="title" defaultValue={title} placeholder="Заголовок резюме" />
            <div className="space-y-2">
              <GroupTitle>Город для каталога</GroupTitle>
              <select className="w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm font-semibold text-zinc-700" name="city" defaultValue={city}>
                {resumeQuizOptions.cities.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="1" className={step === 1 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Возраст"
            title="Укажите возрастной диапазон"
            hint="Точный возраст не нужен, достаточно диапазона."
          >
            <RadioGrid name="ageRange" options={resumeQuizOptions.ageRanges} defaultValue="21-25" columns="grid-cols-2" />
          </QuizQuestion>
        </div>

        <div data-quiz-step="2" className={step === 2 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Опыт"
            title="Какой у вас опыт работы?"
            hint="Выберите один самый близкий вариант."
          >
            <div className="space-y-3">
              <GroupTitle>Опыт работы</GroupTitle>
              <RadioGrid name="experienceMonths" options={resumeQuizOptions.experience} defaultValue={String(resume?.experienceMonths ?? 0)} />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="3" className={step === 3 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Языки"
            title="На каких языках можете общаться?"
            hint="Можно выбрать несколько вариантов."
          >
            <ChoiceGrid name="languages" options={resumeQuizOptions.languages} />
          </QuizQuestion>
        </div>

        <div data-quiz-step="4" className={step === 4 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Личный блок"
            title="Как коротко представить вас студии?"
            hint="Лучше 2-3 честных предложения: стиль работы, цели, что важно в команде и комнате."
          >
            <textarea
              className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-6"
              name="about"
              rows={4}
              maxLength={300}
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="2-3 предложения: стиль работы, цели, что важно в студии. До 300 символов."
            />
            <p className="text-xs text-zinc-500">{about.length}/300</p>
          </QuizQuestion>
        </div>

        <div data-quiz-step="5" className={step === 5 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="График"
            title="Сколько смен в неделю готовы брать?"
            hint="Выберите комфортный диапазон."
          >
            <div className="space-y-3">
              <GroupTitle>Смен в неделю</GroupTitle>
              <RadioGrid name="shiftsPerWeek" options={resumeQuizOptions.shiftsPerWeek} defaultValue="4-5" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="6" className={step === 6 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="График"
            title="Сколько смен в месяц?"
            hint="Это поможет не предлагать слишком плотный или слишком редкий график."
          >
            <div className="space-y-3">
              <GroupTitle>Смен в месяц</GroupTitle>
              <RadioGrid name="shiftsPerMonth" options={resumeQuizOptions.shiftsPerMonth} defaultValue="16-20" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="7" className={step === 7 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Дисциплина"
            title="Какая длительность смены комфортна?"
            hint="Выберите один базовый формат."
          >
            <div className="space-y-3">
              <GroupTitle>Длительность смены</GroupTitle>
              <RadioGrid name="shiftLength" options={resumeQuizOptions.shiftLength} defaultValue="6 часов" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="8" className={step === 8 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Дисциплина"
            title="Как часто бывают пропуски и доп. смены?"
            hint="Честный ответ экономит время обеим сторонам."
          >
            <div className="space-y-3">
              <GroupTitle>Пропуски</GroupTitle>
              <RadioGrid name="missedShifts" options={resumeQuizOptions.discipline} defaultValue="Крайне редко" columns="grid-cols-1" />
              <GroupTitle>Доп. смены / праздники</GroupTitle>
              <RadioGrid name="extraShifts" options={resumeQuizOptions.extraShifts} defaultValue="По договоренности" columns="grid-cols-1" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="9" className={step === 9 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Деньги"
            title="Какой процент и доход минимальны?"
            hint="Это фильтр ожиданий: студия сразу видит нижнюю границу предложения."
          >
            <div className="space-y-3">
              <GroupTitle>Минимальный процент</GroupTitle>
              <RadioGrid name="minimumPercent" options={resumeQuizOptions.percent} defaultValue="60%" />
              <input className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm" name="minimumIncome" placeholder="Минимальный доход в месяц, например $1500" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="10" className={step === 10 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Выплаты"
            title="Как часто хотите получать выплаты?"
            hint="Один короткий фильтр, чтобы студия не предлагала неудобный формат расчетов."
          >
            <div className="space-y-3">
              <GroupTitle>Частота выплат</GroupTitle>
              <RadioGrid name="payoutFrequency" options={resumeQuizOptions.payout} defaultValue="Еженедельно" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="11" className={step === 11 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Студия"
            title="Какое оборудование обязательно?"
            hint="Отмечайте только важное."
          >
            <div className="space-y-3">
              <GroupTitle>Оборудование</GroupTitle>
              <ChoiceGrid name="equipmentRequirements" options={resumeQuizOptions.equipment} />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="12" className={step === 12 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Студия"
            title="Какая организация смены важна?"
            hint="Можно выбрать несколько пунктов."
          >
            <div className="space-y-3">
              <GroupTitle>Организация</GroupTitle>
              <ChoiceGrid name="orgRequirements" options={resumeQuizOptions.organization} />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="13" className={step === 13 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Комната"
            title="Какие условия комнаты обязательны?"
            hint="Отмечайте только то, без чего действительно не готовы работать."
          >
            <div className="space-y-3">
              <GroupTitle>Комната</GroupTitle>
              <ChoiceGrid name="roomRequirements" options={resumeQuizOptions.rooms} />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="14" className={step === 14 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Интерьер"
            title="Какой стиль комнаты вам подходит?"
            hint="Если стиль не важен, оставьте вариант по умолчанию."
          >
            <div className="space-y-3">
              <GroupTitle>Интерьер</GroupTitle>
              <RadioGrid name="interiorStyle" options={resumeQuizOptions.interiors} defaultValue="Без разницы" />
            </div>
          </QuizQuestion>
        </div>

        <div data-quiz-step="15" className={step === 15 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Стоп-лист"
            title="Что точно не рассматриваете?"
            hint="Этот блок нужен для безопасности и экономии времени: студии с неподходящими условиями не должны попадать в диалог."
          >
            <textarea className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm leading-5" name="blockedStudios" rows={2} placeholder="Названия студий или юр. лиц, которые не рассматриваете" />
            <ChoiceGrid name="stopConditions" options={resumeQuizOptions.stop} />
            <input className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm" name="stopOther" placeholder="Другое стоп-условие" />
          </QuizQuestion>
        </div>

        <div data-quiz-step="16" className={step === 16 ? "min-h-0 flex-1" : "hidden"}>
          <QuizQuestion
            eyebrow="Финал"
            title="Куда студии смогут отправить отклик?"
            hint="Контакты видны авторизованным пользователям. Перед сохранением подтвердите, что требования актуальны."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-lg border border-zinc-200 bg-white p-2.5 text-sm" name="contactEmail" defaultValue={resume?.contactEmail || ""} placeholder="Email (скрыто от гостей)" />
              <input className="rounded-lg border border-zinc-200 bg-white p-2.5 text-sm" name="contactTelegram" defaultValue={resume?.contactTelegram || ""} placeholder="Telegram / телефон (скрыто от гостей)" />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
              <input className="mt-1 h-4 w-4 accent-hot" type="checkbox" name="resumeConfirm" required />
              <span>Я подтверждаю, что требования актуальны. Если студия предложит условия хуже указанных, я могу отказаться.</span>
            </label>
          </QuizQuestion>
        </div>

        <input type="hidden" name="bio" value={preview} />
        <div className="hidden shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-600 sm:block">
          <span className="font-semibold text-zinc-900">Мини-превью:</span>
          <p className="mt-1 line-clamp-2">{preview}</p>
        </div>

        <div className="quiz-footer">
          <button
            className="quiz-back"
            type="button"
            disabled={step === 0}
            data-quiz-back
            onClick={(event) => {
              event.preventDefault();
              goToStep(step - 1);
            }}
          >
            Назад
          </button>
          {!lastStep ? (
            <button
              className="quiz-next"
              type="button"
              data-quiz-next
              onClick={(event) => {
                event.preventDefault();
                goToStep(step + 1);
              }}
            >
              Далее
            </button>
          ) : (
            <button className="quiz-next" type="submit">
              Сохранить резюме
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
