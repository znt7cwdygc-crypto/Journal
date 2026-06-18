"use client";

import { useMemo, useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import { serviceQuizOptions, serviceQuizSteps } from "@/lib/quizzes/service-quiz";
import { vacancyQuizOptions, vacancyQuizSteps } from "@/lib/quizzes/vacancy-quiz";

type ListingKind = "VACANCY" | "SERVICE";

type ListingQuizFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  kind: ListingKind;
  initialValues?: Record<string, string | string[] | null | undefined>;
  listingId?: string;
  submitLabel?: string;
};

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
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600 sm:text-sm">{hint}</p>
      </div>
      <div className="quiz-content">{children}</div>
    </div>
  );
}

function ChoiceGrid({
  name,
  options,
  defaultValue,
  columns = "grid-cols-2"
}: {
  name: string;
  options: string[];
  defaultValue: string;
  columns?: string;
}) {
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((value) => (
        <label
          key={value}
          className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold leading-snug text-zinc-700 transition hover:border-hot hover:bg-red-50 has-[:checked]:border-hot has-[:checked]:bg-red-50 sm:min-h-11 sm:px-3 sm:py-2 sm:text-sm"
        >
          <input className="h-3.5 w-3.5 shrink-0 accent-hot" type="radio" name={name} value={value} defaultChecked={defaultValue === value} />
          <span>{value}</span>
        </label>
      ))}
    </div>
  );
}

function CheckGrid({ name, options, defaultValues = [] }: { name: string; options: string[]; defaultValues?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((value) => (
        <label
          key={value}
          className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold leading-snug text-zinc-700 transition hover:border-hot hover:bg-red-50 has-[:checked]:border-hot has-[:checked]:bg-red-50 sm:min-h-11 sm:px-3 sm:py-2 sm:text-sm"
        >
          <input className="h-3.5 w-3.5 shrink-0 accent-hot" type="checkbox" name={name} value={value} defaultChecked={defaultValues.includes(value)} />
          <span>{value}</span>
        </label>
      ))}
    </div>
  );
}

function TextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm ${className}`} />;
}

function TextArea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm leading-6 sm:min-h-32 ${className}`} />;
}

function stringValue(values: ListingQuizFormProps["initialValues"], key: string, fallback = "") {
  const value = values?.[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function arrayValue(values: ListingQuizFormProps["initialValues"], key: string) {
  const value = values?.[key];
  if (Array.isArray(value)) return value;
  return typeof value === "string" && value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export function ListingQuizForm({ action, kind, initialValues, listingId, submitLabel }: ListingQuizFormProps) {
  const [step, setStep] = useState(0);
  const quizRef = useRef<HTMLElement | null>(null);
  const isService = kind === "SERVICE";
  const steps = useMemo(() => (isService ? serviceQuizSteps : vacancyQuizSteps), [isService]);
  const lastStep = step === steps.length - 1;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const stepsPayload = JSON.stringify(steps);

  function canLeaveCurrentStep() {
    const activeStep = quizRef.current?.querySelector('[data-active="true"]');
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
    window.setTimeout(() => {
      quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  return (
    <section ref={quizRef} className="quiz-shell" data-quiz-root data-quiz-step-current="0" data-quiz-steps={stepsPayload}>
      <div className="quiz-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">{isService ? "Квиз-услуга" : "Квиз-вакансия"}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {submitLabel ? (isService ? "Редактировать услугу" : "Редактировать вакансию") : isService ? "Предложить услугу" : "Подать вакансию"}
            </h2>
          </div>
          <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">бесплатно</span>
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
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="listingTemplate" value={isService ? "service-v1" : "vacancy-specialist-v1"} />
        {listingId && <input type="hidden" name="listingId" value={listingId} />}

        {!isService && (
          <>
            <div data-active={step === 0 ? "true" : undefined} data-quiz-step="0" className={step === 0 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Роль" title="Кого ищете?" hint="Вакансии для моделей здесь запрещены: только специалисты команды.">
                <ChoiceGrid name="vacancyRole" options={vacancyQuizOptions.roles} defaultValue={stringValue(initialValues, "vacancyRole", "Оператор")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 1 ? "true" : undefined} data-quiz-step="1" className={step === 1 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Название" title="Как назвать вакансию?" hint="Коротко: роль, формат и главная причина откликнуться.">
                <TextInput name="title" defaultValue={stringValue(initialValues, "title")} placeholder="Например: Оператор в студию на вечерние смены" required={step === 1} />
              </QuizQuestion>
            </div>
            <div data-active={step === 2 ? "true" : undefined} data-quiz-step="2" className={step === 2 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Формат" title="Как будет работать специалист?" hint="Формат должен быть понятен до отклика.">
                <ChoiceGrid name="employmentType" options={vacancyQuizOptions.employmentTypes} defaultValue={stringValue(initialValues, "employmentType", "REMOTE")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 3 ? "true" : undefined} data-quiz-step="3" className={step === 3 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Город" title="Где актуальна вакансия?" hint="Для удаленной вакансии можно выбрать удаленный формат.">
                <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700" name="city" defaultValue={stringValue(initialValues, "city", "Москва")}>
                  {vacancyQuizOptions.cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <TextInput name="geoCode" defaultValue={stringValue(initialValues, "geoCode")} placeholder="GEO код, если нужен: moscow, remote" />
              </QuizQuestion>
            </div>
            <div data-active={step === 4 ? "true" : undefined} data-quiz-step="4" className={step === 4 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Оплата" title="Какая оплата?" hint="Укажите ставку, процент, оклад или вилку.">
                <TextInput name="price" defaultValue={stringValue(initialValues, "price")} placeholder="Например: от 70 000 ₽ / 20% / договорная" required={step === 4} />
                <TextInput name="priceComment" defaultValue={stringValue(initialValues, "priceComment")} placeholder="Выплаты, бонусы, испытательный срок" />
              </QuizQuestion>
            </div>
            <div data-active={step === 5 ? "true" : undefined} data-quiz-step="5" className={step === 5 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="График" title="Какой график и занятость?" hint="Это один из главных фильтров для кандидата.">
                <TextInput name="schedule" defaultValue={stringValue(initialValues, "schedule")} placeholder="Например: 5/2, вечер, 6 часов, удаленно" required={step === 5} />
                <ChoiceGrid name="workload" options={vacancyQuizOptions.workload} defaultValue={stringValue(initialValues, "workload", "Сменная")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 6 ? "true" : undefined} data-quiz-step="6" className={step === 6 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Требования" title="Что должен уметь специалист?" hint="Без общих слов: опыт, навыки, языки, инструменты.">
                <TextArea name="requirements" defaultValue={stringValue(initialValues, "requirements")} placeholder="Опишите опыт, навыки, английский, CRM, графики, ответственность" required={step === 6} />
              </QuizQuestion>
            </div>
            <div data-active={step === 7 ? "true" : undefined} data-quiz-step="7" className={step === 7 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Условия" title="Что вы предоставляете?" hint="Обучение, регламенты, команда, техника, рабочее место, поддержка.">
                <CheckGrid name="benefits" options={vacancyQuizOptions.benefits} defaultValues={arrayValue(initialValues, "benefits")} />
                <TextInput name="benefitsOther" defaultValue={stringValue(initialValues, "benefitsOther")} placeholder="Другие условия" />
              </QuizQuestion>
            </div>
            <div data-active={step === 8 ? "true" : undefined} data-quiz-step="8" className={step === 8 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Стоп" title="Кто не подойдет?" hint="Помогает не получать нерелевантные отклики.">
                <TextArea name="stopConditions" defaultValue={stringValue(initialValues, "stopConditions")} placeholder="Например: без регулярного графика, без базового английского, без готовности учиться" />
              </QuizQuestion>
            </div>
            <div data-active={step === 9 ? "true" : undefined} data-quiz-step="9" className={step === 9 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Контакт" title="Куда отправлять отклик?" hint="Контакт будет виден на странице вакансии.">
                <TextInput name="contact" defaultValue={stringValue(initialValues, "contact")} placeholder="Telegram, email или другой контакт" required={step === 9} />
                <TextArea name="description" defaultValue={stringValue(initialValues, "description")} placeholder="Короткое описание вакансии для карточки" required={step === 9} />
              </QuizQuestion>
            </div>
          </>
        )}

        {isService && (
          <>
            <div data-active={step === 0 ? "true" : undefined} data-quiz-step="0" className={step === 0 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Категория" title="Какую услугу предлагаете?" hint="Можно выбрать общий тип, а детали раскрыть дальше.">
                <ChoiceGrid name="serviceCategory" options={serviceQuizOptions.categories} defaultValue={stringValue(initialValues, "serviceCategory", "Консультация")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 1 ? "true" : undefined} data-quiz-step="1" className={step === 1 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Название" title="Как назвать услугу?" hint="Название должно объяснять пользу за пару секунд.">
                <TextInput name="title" defaultValue={stringValue(initialValues, "title")} placeholder="Например: Настройка OBS, света и камеры за 1 созвон" required={step === 1} />
              </QuizQuestion>
            </div>
            <div data-active={step === 2 ? "true" : undefined} data-quiz-step="2" className={step === 2 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Формат" title="Как оказывается услуга?" hint="Онлайн, в городе или смешанный формат.">
                <ChoiceGrid name="employmentType" options={serviceQuizOptions.employmentTypes} defaultValue={stringValue(initialValues, "employmentType", "REMOTE")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 3 ? "true" : undefined} data-quiz-step="3" className={step === 3 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Город" title="Где вы работаете?" hint="Для онлайн-услуги можно выбрать удаленно.">
                <select className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-700" name="city" defaultValue={stringValue(initialValues, "city", "Удаленно")}>
                  {serviceQuizOptions.cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <TextInput name="geoCode" defaultValue={stringValue(initialValues, "geoCode")} placeholder="GEO код, если нужен: remote, moscow" />
              </QuizQuestion>
            </div>
            <div data-active={step === 4 ? "true" : undefined} data-quiz-step="4" className={step === 4 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Цена" title="Сколько стоит услуга?" hint="Цена обязательна: можно указать вилку или договорную стоимость.">
                <TextInput name="price" defaultValue={stringValue(initialValues, "price")} placeholder="Например: от 5 000 ₽ / 50$ / договорная" required={step === 4} />
                <TextInput name="priceComment" defaultValue={stringValue(initialValues, "priceComment")} placeholder="Что влияет на цену, есть ли предоплата" />
              </QuizQuestion>
            </div>
            <div data-active={step === 5 ? "true" : undefined} data-quiz-step="5" className={step === 5 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Состав" title="Что входит в услугу?" hint="Конкретный список снижает лишние вопросы в личке.">
                <TextArea name="serviceIncludes" defaultValue={stringValue(initialValues, "serviceIncludes")} placeholder="Опишите пункты: созвон, аудит, настройка, документы, отчет, поддержка" required={step === 5} />
              </QuizQuestion>
            </div>
            <div data-active={step === 6 ? "true" : undefined} data-quiz-step="6" className={step === 6 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Опыт" title="Почему вам можно доверять?" hint="Кейсы, опыт, специализация, портфолио или ссылка.">
                <TextArea name="experience" defaultValue={stringValue(initialValues, "experience")} placeholder="Опыт, результаты, с кем работали, какие задачи решаете" required={step === 6} />
                <TextInput name="portfolioUrl" defaultValue={stringValue(initialValues, "portfolioUrl")} placeholder="Ссылка на портфолио или профиль, если есть" />
              </QuizQuestion>
            </div>
            <div data-active={step === 7 ? "true" : undefined} data-quiz-step="7" className={step === 7 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Срок" title="Сколько занимает работа?" hint="Помогает понять ожидания до первого сообщения.">
                <TextInput name="deliveryTime" defaultValue={stringValue(initialValues, "deliveryTime")} placeholder="Например: 1 созвон, 2 дня, неделя сопровождения" required={step === 7} />
                <ChoiceGrid name="availability" options={serviceQuizOptions.availability} defaultValue={stringValue(initialValues, "availability", "По записи")} />
              </QuizQuestion>
            </div>
            <div data-active={step === 8 ? "true" : undefined} data-quiz-step="8" className={step === 8 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Ограничения" title="С чем не работаете?" hint="Стоп-темы и границы услуги защищают обе стороны.">
                <TextArea name="stopConditions" defaultValue={stringValue(initialValues, "stopConditions")} placeholder="Например: не беру срочные задачи ночью, не работаю без предоплаты, не даю юридических гарантий" />
              </QuizQuestion>
            </div>
            <div data-active={step === 9 ? "true" : undefined} data-quiz-step="9" className={step === 9 ? "min-h-0 flex-1" : "hidden"}>
              <QuizQuestion eyebrow="Контакт" title="Куда писать клиенту?" hint="Контакт будет виден на странице услуги.">
                <TextInput name="contact" defaultValue={stringValue(initialValues, "contact")} placeholder="Telegram, email или другой контакт" required={step === 9} />
                <TextArea name="description" defaultValue={stringValue(initialValues, "description")} placeholder="Короткое описание услуги для карточки" required={step === 9} />
              </QuizQuestion>
            </div>
          </>
        )}

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
            <FormSubmitButton className="quiz-next" pendingText={submitLabel ? "Сохраняем..." : "Публикуем..."}>
              {submitLabel ?? "Опубликовать"}
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}
