"use client";

import { useMemo, useRef, useState } from "react";
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

type Role = "MODEL" | "OPERATOR";
type Importance = "must" | "nice" | "none";

const steps = ["Роль", "Суть", "Формат", "Оплата", "Требования", "О себе", "Итог"];
const roleLabels: Record<Role, string> = { MODEL: "Модель ищет оператора", OPERATOR: "Оператор ищет модель" };
const lookingForByRole: Record<Role, Role> = { MODEL: "OPERATOR", OPERATOR: "MODEL" };
const workFormatByText: Record<string, "REMOTE" | "OFFICE" | "HYBRID"> = {
  "Удалённо": "REMOTE",
  "Очно": "OFFICE",
  "Любой вариант": "HYBRID"
};

const modelNeedHelp = [
  "Ведение OnlyFans/LoyalFans",
  "Организация и поддержка стримов",
  "Монтаж и обработка контента",
  "Продвижение/маркетинг профиля",
  "Общение с подписчиками (чат)",
  "Помощь на офлайн-съёмках",
  "Другое"
];
const operatorSpecialization = [
  "Ведение OnlyFans/LoyalFans",
  "Чат-менеджмент",
  "Монтаж и обработка контента",
  "Продвижение/маркетинг",
  "Техподдержка стримов (свет/звук/OBS)",
  "Операторская работа на офлайн-площадке",
  "Другое"
];
const platforms = ["OnlyFans", "LoyalFans", "Fansly", "ManyVids", "Стрим (Chaturbate и т.п.)", "Другое"];
const formatOptions = ["Удалённо", "Очно", "Любой вариант"];
const modelLoad = ["Разовая задача", "Несколько часов в день", "Полный рабочий день"];
const operatorEmployment = ["Постоянно", "Проектно", "Подработка"];
const payFormats = ["% от дохода", "Фиксированная ставка", "Почасовая", "За проект"];

const modelRequirements = [
  { field: "expReqM", label: "Опыт работы", options: ["Без опыта", "От 6 месяцев", "От 1 года", "От 2 лет"] },
  { field: "skillsReqM", label: "Навыки", options: ["Монтаж видео", "Чат-менеджмент", "SEO/продвижение", "Настройка стрима (свет/звук/OBS)", "Английский язык"], multi: true },
  { field: "availReqM", label: "Доступность", options: ["Совпадает часовой пояс", "Готов работать по ночам", "Готов работать в выходные"] },
  { field: "ndaReqM", label: "Конфиденциальность", options: ["Готовность подписать NDA", "Без разницы"] },
  { field: "genderReqM", label: "Пол оператора", options: ["Не важно", "Женщина", "Мужчина"] }
];
const operatorRequirements = [
  { field: "categoryReqO", label: "Категория модели", options: ["Соло", "Парная работа", "Групповые шоу", "Фетиш-ниши", "Любая"], multi: true },
  { field: "expReqO", label: "Опыт модели", options: ["Без опыта ок", "От 6 месяцев", "От 1 года"] },
  { field: "volumeReqO", label: "Объём/частота контента", options: ["Регулярная съёмка (несколько раз в неделю)", "Разовые проекты", "Без разницы"] },
  { field: "termReqO", label: "Долгосрочность сотрудничества", options: ["Только долгосрочное", "Разовый проект ок", "Без разницы"] },
  { field: "genderReqO", label: "Пол модели", options: ["Не важно", "Женщина", "Мужчина"] }
];

function join(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-2 text-sm font-medium transition ${
    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-[#E4E4E1] bg-white text-ink hover:border-hot"
  }`;
}

function importanceClass(active: boolean, level: Importance) {
  const activeClass =
    level === "must"
      ? "border-hot bg-red-50 text-red-800"
      : level === "nice"
        ? "border-amber-400 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-100 text-ink";
  return `flex-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${active ? activeClass : "border-[#E4E4E1] bg-white text-zinc-500"}`;
}

function HiddenList({ name, values }: { name: string; values: string[] }) {
  return values.map((value) => <input key={`${name}-${value}`} type="hidden" name={name} value={value} />);
}

function ChipGroup({
  options,
  value,
  onChange,
  multi = false,
  otherPlaceholder
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
  otherPlaceholder?: string;
}) {
  const otherActive = value.includes("Другое") || value.includes("Другой");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={chipClass(value.includes(option))}
            onClick={() => {
              if (multi) {
                onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
              } else {
                onChange(value.includes(option) ? [] : [option]);
              }
            }}
          >
            {option}
          </button>
        ))}
      </div>
      {otherActive && (
        <input
          className="w-full rounded-xl border border-[#E4E4E1] bg-white px-3 py-2 text-sm outline-none focus:border-hot"
          placeholder={otherPlaceholder || "Уточните"}
          value={value.find((item) => !options.includes(item)) || ""}
          onChange={(event) => {
            const base = value.filter((item) => options.includes(item));
            onChange(event.target.value.trim() ? [...base, event.target.value] : base);
          }}
        />
      )}
    </div>
  );
}

function RequirementCard({
  requirement,
  values,
  importance,
  setValues,
  setImportance
}: {
  requirement: { field: string; label: string; options: string[]; multi?: boolean };
  values: Record<string, string[]>;
  importance: Record<string, Importance>;
  setValues: (field: string, value: string[]) => void;
  setImportance: (field: string, value: Importance) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E4E1] p-3">
      <span className="mb-2 block text-sm font-semibold text-ink">{requirement.label}</span>
      <ChipGroup
        options={requirement.options}
        value={values[requirement.field] || []}
        onChange={(next) => setValues(requirement.field, next)}
        multi={requirement.multi}
      />
      <div className="mt-3 flex gap-1.5">
        {[
          ["must", "Обязательно"],
          ["nice", "Желательно"],
          ["none", "Не важно"]
        ].map(([level, label]) => (
          <button
            key={level}
            type="button"
            className={importanceClass((importance[requirement.field] || "none") === level, level as Importance)}
            onClick={() => setImportance(requirement.field, level as Importance)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#E4E4E1] py-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[58%] text-right font-semibold text-ink">{value || "—"}</span>
    </div>
  );
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
  const defaultRole = profile?.seekerRole === "OPERATOR" || profileKind === "OPERATOR" ? "OPERATOR" : "MODEL";
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(defaultRole);
  const [needHelp, setNeedHelp] = useState<string[]>([]);
  const [specialization, setSpecialization] = useState<string[]>([]);
  const [format, setFormat] = useState<string[]>([profile?.workFormat === "OFFICE" ? "Очно" : profile?.workFormat === "HYBRID" ? "Любой вариант" : "Удалённо"]);
  const [platformsValue, setPlatformsValue] = useState<string[]>([]);
  const [load, setLoad] = useState<string[]>([]);
  const [payFormat, setPayFormat] = useState<string[]>([]);
  const [payAmount, setPayAmount] = useState(profile?.operatorPercent || "");
  const [requirements, setRequirements] = useState<Record<string, string[]>>({});
  const [importance, setImportanceState] = useState<Record<string, Importance>>({});
  const [about, setAbout] = useState(profile?.bio || "");
  const [portfolio, setPortfolio] = useState("");
  const [contact, setContact] = useState(profile?.contact || "");
  const [city, setCity] = useState(profile?.city || "");
  const rootRef = useRef<HTMLElement | null>(null);
  const isModel = role === "MODEL";
  const isLast = step === steps.length - 1;
  const progress = Math.round((step / (steps.length - 1)) * 100);
  const selectedRequirements = isModel ? modelRequirements : operatorRequirements;
  const selectedWorkFormat = format[0] || "Удалённо";
  const workFormat = workFormatByText[selectedWorkFormat] || "REMOTE";
  const title = useMemo(() => {
    const main = isModel ? join(needHelp) : join(specialization);
    return isModel
      ? `Модель ищет оператора${main ? `: ${main}` : ""}`
      : `Оператор ищет модель${main ? `: ${main}` : ""}`;
  }, [isModel, needHelp, specialization]);
  const schedule = isModel ? join(load) : join(load);
  const niche = join(platformsValue);

  function setRequirementValues(field: string, value: string[]) {
    setRequirements((current) => ({ ...current, [field]: value }));
  }

  function setImportance(field: string, value: Importance) {
    setImportanceState((current) => ({ ...current, [field]: value }));
  }

  function canLeaveCurrentStep() {
    if (step === 0) return true;
    if (step === 1) return isModel ? needHelp.length > 0 : specialization.length > 0;
    if (step === 2) return format.length > 0 && platformsValue.length > 0 && load.length > 0;
    if (step === 5) return about.trim().length >= 20 && contact.trim().length >= 2;
    return true;
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !canLeaveCurrentStep()) {
      rootRef.current?.querySelector<HTMLElement>("[data-step-error]")?.focus();
      return;
    }
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  return (
    <section ref={rootRef} className="quiz-shell border-[#E4E4E1] bg-white" data-quiz-root>
      <div className="quiz-header bg-white">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Шаг {step + 1} из {steps.length}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E4E1]">
          <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${isModel ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {roleLabels[role]}
        </span>
      </div>

      <form action={action} className="quiz-body bg-white">
        <input type="hidden" name="seekerRole" value={role} />
        <input type="hidden" name="lookingFor" value={lookingForByRole[role]} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="workFormat" value={workFormat} />
        <input type="hidden" name="experience" value={isModel ? (requirements.expReqM?.[0] || "Не указан") : (requirements.expReqO?.[0] || "Не указан")} />
        <input type="hidden" name="schedule" value={schedule || "По договоренности"} />
        <input type="hidden" name="timezone" value="" />
        <input type="hidden" name="operatorPercent" value={payAmount} />
        <input type="hidden" name="currentCheck" value={payAmount} />
        <input type="hidden" name="niche" value={niche} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="bio" value={about} />
        <input type="hidden" name="contact" value={contact} />
        <input type="hidden" name="portfolio" value={portfolio} />
        <input type="hidden" name="payFormat" value={join(payFormat)} />
        <HiddenList name="needHelp" values={needHelp} />
        <HiddenList name="specialization" values={specialization} />
        <HiddenList name="platforms" values={platformsValue} />
        <HiddenList name="load" values={load} />
        {selectedRequirements.map((requirement) => (
          <div key={`${requirement.field}-hidden`}>
            <HiddenList name={requirement.field} values={requirements[requirement.field] || []} />
            <input type="hidden" name={`${requirement.field}Importance`} value={importance[requirement.field] || "none"} />
          </div>
        ))}

        <div className={step === 0 ? "quiz-content space-y-4" : "hidden"}>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-ink">Объявление: Модель / Оператор</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Бесплатное объявление на 14 дней. Выберите, кто вы, и квиз подстроится под сценарий.</p>
          </div>
          <div className="grid gap-3">
            {(["MODEL", "OPERATOR"] as Role[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-2xl border-2 p-4 text-left transition ${role === item ? "border-hot bg-red-50" : "border-[#E4E4E1] bg-white hover:border-hot"}`}
                onClick={() => {
                  setRole(item);
                  setLoad([]);
                  setPayFormat([]);
                }}
              >
                <span className="block font-bold text-ink">{roleLabels[item]}</span>
                <span className="mt-1 block text-sm leading-5 text-zinc-500">
                  {item === "MODEL" ? "Нужна помощь с площадками, стримами, монтажом или съемками" : "Предлагаю навыки: площадки, чат, продакшн, продвижение"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={step === 1 ? "quiz-content space-y-4" : "hidden"}>
          <div>
            <h2 className="text-xl font-bold text-ink">{isModel ? "Какая помощь нужна" : "Твоя специализация"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Можно выбрать несколько пунктов.</p>
          </div>
          <ChipGroup
            options={isModel ? modelNeedHelp : operatorSpecialization}
            value={isModel ? needHelp : specialization}
            onChange={isModel ? setNeedHelp : setSpecialization}
            multi
            otherPlaceholder={isModel ? "Уточните, какая помощь нужна" : "Уточните специализацию"}
          />
          <p tabIndex={-1} data-step-error className="text-xs text-zinc-400">Выберите хотя бы один пункт, чтобы объявление было понятным.</p>
        </div>

        <div className={step === 2 ? "quiz-content space-y-5" : "hidden"}>
          <div>
            <h2 className="text-xl font-bold text-ink">Формат работы</h2>
            <p className="mt-1 text-sm text-zinc-500">Формат, платформы и загрузка.</p>
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Формат сотрудничества</span>
            <ChipGroup options={formatOptions} value={format} onChange={setFormat} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">{isModel ? "Платформы" : "С какими платформами работал"}</span>
            <ChipGroup options={platforms} value={platformsValue} onChange={setPlatformsValue} multi otherPlaceholder="Уточните платформу" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">{isModel ? "Загрузка" : "Занятость"}</span>
            <ChipGroup options={isModel ? modelLoad : operatorEmployment} value={load} onChange={setLoad} />
          </div>
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город, если нужен офлайн-формат" />
        </div>

        <div className={step === 3 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Оплата</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">{isModel ? "Формат оплаты" : "Ожидания по оплате"}</span>
            <ChipGroup options={payFormats} value={payFormat} onChange={setPayFormat} />
          </div>
          <input
            className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot"
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
            placeholder={isModel ? "Например: 15% от дохода" : "Например: от $10/час"}
          />
        </div>

        <div className={step === 4 ? "quiz-content space-y-3" : "hidden"}>
          <div>
            <h2 className="text-xl font-bold text-ink">{isModel ? "Требования к оператору" : "Требования к модели"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Отметьте, что обязательно, а что просто пожелание.</p>
          </div>
          {selectedRequirements.map((requirement) => (
            <RequirementCard
              key={requirement.field}
              requirement={requirement}
              values={requirements}
              importance={importance}
              setValues={setRequirementValues}
              setImportance={setImportance}
            />
          ))}
        </div>

        <div className={step === 5 ? "quiz-content space-y-4" : "hidden"}>
          <div>
            <h2 className="text-xl font-bold text-ink">О себе</h2>
            <p className="mt-1 text-sm text-zinc-500">Короткое описание, портфолио и контакт для связи.</p>
          </div>
          <textarea
            className="min-h-32 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot"
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            placeholder={isModel ? "Например: работаю соло на Chaturbate 2 года, ищу оператора на стримы 3-4 раза в неделю" : "Например: 3 года веду OnlyFans-аккаунты, специализация — чат-менеджмент и продвижение"}
          />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={portfolio} onChange={(event) => setPortfolio(event.target.value)} placeholder="Портфолио/профиль/кейсы, необязательно" />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Telegram или email" />
          <p tabIndex={-1} data-step-error className="text-xs text-zinc-400">Описание от 20 символов и контакт обязательны.</p>
        </div>

        <div className={step === 6 ? "quiz-content space-y-4" : "hidden"}>
          <div>
            <h2 className="text-xl font-bold text-ink">Объявление готово</h2>
            <p className="mt-1 text-sm text-zinc-500">Проверьте перед публикацией.</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Объявление</p>
            <SummaryRow label="Роль" value={roleLabels[role]} />
            <SummaryRow label={isModel ? "Нужна помощь" : "Специализация"} value={isModel ? join(needHelp) : join(specialization)} />
            <SummaryRow label="Формат" value={selectedWorkFormat} />
            <SummaryRow label="Платформы" value={join(platformsValue)} />
            <SummaryRow label={isModel ? "Загрузка" : "Занятость"} value={join(load)} />
            <SummaryRow label="Оплата" value={[join(payFormat), payAmount].filter(Boolean).join(" · ")} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О себе</p>
            <SummaryRow label="Описание" value={about} />
            <SummaryRow label="Портфолио" value={portfolio} />
            <SummaryRow label="Контакт" value={contact} />
          </div>
        </div>

        <div className="quiz-footer">
          <button className="quiz-back" type="button" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            Назад
          </button>
          {!isLast ? (
            <button className="quiz-next bg-hot" type="button" onClick={() => goToStep(step + 1)}>
              {step === 0 ? "Начать" : step === steps.length - 2 ? "Посмотреть объявление" : "Далее"}
            </button>
          ) : (
            <FormSubmitButton className="quiz-next bg-hot" pendingText="Публикуем...">
              Опубликовать объявление
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}
