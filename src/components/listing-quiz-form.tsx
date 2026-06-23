"use client";

import { useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import { serviceQuizOptions, serviceQuizSteps } from "@/lib/quizzes/service-quiz";

type ServiceState = {
  audience: string;
  category: string;
  categoryOther: string;
  serviceName: string;
  serviceDesc: string;
  formatService: string;
  duration: string;
  guarantee: string;
  payFormat: string;
  priceInput: string;
  payMethods: string[];
  prepay: string;
  prepayImportance: string;
  minOrder: string;
  minOrderImportance: string;
  access: string[];
  accessImportance: string;
  nda: string;
  ndaImportance: string;
  providerType: string;
  providerExp: string;
  portfolio: string;
  contact: string;
  city: string;
  quickWishes: string[];
  wishesText: string;
};
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

type VacancyState = {
  employerType: string;
  employerTypeOther: string;
  companyName: string;
  position: string;
  positionOther: string;
  positionDetail: string;
  duties: string;
  employment: string;
  workFormat: string;
  schedule: string;
  payFormat: string;
  salaryRange: string;
  payFrequency: string;
  expReq: string;
  expReqImportance: string;
  skillsReq: string[];
  skillsReqOther: string;
  skillsReqImportance: string;
  eduReq: string;
  eduReqImportance: string;
  langReq: string[];
  langReqOther: string;
  langReqImportance: string;
  ageReq: string;
  ageReqImportance: string;
  genderReq: string;
  genderReqImportance: string;
  location: string;
  aboutCompany: string;
  website: string;
  contact: string;
};

const importanceTone: Record<string, string> = {
  must: "border-[#FF5A36] bg-red-50 text-[#C13A1E]",
  nice: "border-[#E0A100] bg-yellow-50 text-[#8A6700]",
  none: "border-zinc-200 bg-zinc-100 text-zinc-700"
};

const importanceText: Record<string, string> = {
  must: "обязательно",
  nice: "желательно",
  none: "не важно"
};

function selectedValue(value: string, other: string) {
  return value === "Другое" || value === "Другой" ? other.trim() || value : value;
}

function selectedList(values: string[], other: string) {
  return values.map((value) => (value === "Другое" || value === "Другой" ? other.trim() || value : value));
}

function vacancyEmploymentType(format: string) {
  if (format === "Очно") return "OFFICE";
  if (format === "Гибридный") return "HYBRID";
  return "REMOTE";
}

function reverseVacancyEmploymentType(value: string) {
  if (value === "OFFICE") return "Очно";
  if (value === "HYBRID") return "Гибридный";
  return "Удалённо";
}

function VacancyChip({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        active ? "border-ink bg-ink text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-hot hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ImportancePicker({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {vacancyQuizOptions.importance.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
            value === option.value ? importanceTone[option.value] : "border-zinc-200 bg-white text-zinc-500 hover:border-hot"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function VacancyTextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-hot ${className}`} />;
}

function VacancyTextArea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-28 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-hot ${className}`} />;
}

function VacancySummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-zinc-100 py-2 text-sm">
      <span className="min-w-28 shrink-0 text-zinc-500">{label}</span>
      <span className="font-semibold text-ink">{value || "—"}</span>
    </div>
  );
}

function VacancyWizard({ action, initialValues, listingId, submitLabel }: Omit<ListingQuizFormProps, "kind">) {
  const [step, setStep] = useState(0);
  const quizRef = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<VacancyState>(() => ({
    employerType: "Вебкам-студия (офлайн)",
    employerTypeOther: "",
    companyName: "",
    position: stringValue(initialValues, "vacancyRole", "Администратор"),
    positionOther: "",
    positionDetail: stringValue(initialValues, "title"),
    duties: stringValue(initialValues, "description"),
    employment: stringValue(initialValues, "workload", "Полная занятость"),
    workFormat: reverseVacancyEmploymentType(stringValue(initialValues, "employmentType", "OFFICE")),
    schedule: stringValue(initialValues, "schedule", "Сменный график"),
    payFormat: "Фиксированная зарплата",
    salaryRange: stringValue(initialValues, "price"),
    payFrequency: "2 раза в месяц",
    expReq: "От 6 месяцев",
    expReqImportance: "nice",
    skillsReq: [],
    skillsReqOther: "",
    skillsReqImportance: "nice",
    eduReq: "Не важно",
    eduReqImportance: "none",
    langReq: ["Русский"],
    langReqOther: "",
    langReqImportance: "nice",
    ageReq: "От 18",
    ageReqImportance: "must",
    genderReq: "Не важно",
    genderReqImportance: "none",
    location: stringValue(initialValues, "city"),
    aboutCompany: stringValue(initialValues, "benefitsOther"),
    website: "",
    contact: stringValue(initialValues, "contact")
  }));

  const steps = vacancyQuizSteps;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const role = selectedValue(values.position, values.positionOther);
  const employer = selectedValue(values.employerType, values.employerTypeOther);
  const title = values.positionDetail.trim() || `${role} в ${values.companyName.trim() || "студию"}`;
  const city = values.location.trim() || (values.workFormat === "Удалённо" ? "Удаленно" : "");
  const price = [values.payFormat, values.salaryRange].filter(Boolean).join(": ") || "Договорная";
  const payComment = values.payFrequency ? `Выплаты: ${values.payFrequency}` : "";
  const skills = selectedList(values.skillsReq, values.skillsReqOther);
  const requirements = [
    `Опыт работы: ${values.expReq} (${importanceText[values.expReqImportance]})`,
    skills.length ? `Навыки: ${skills.join(", ")} (${importanceText[values.skillsReqImportance]})` : null,
    `Образование: ${values.eduReq} (${importanceText[values.eduReqImportance]})`,
    values.langReq.length ? `Языки: ${selectedList(values.langReq, values.langReqOther).join(", ")} (${importanceText[values.langReqImportance]})` : null,
    `Возраст: ${values.ageReq} (${importanceText[values.ageReqImportance]})`,
    `Пол кандидата: ${values.genderReq} (${importanceText[values.genderReqImportance]})`
  ].filter(Boolean).join("\n");
  const mustCriteria = [
    values.expReqImportance === "must" ? `Опыт: ${values.expReq}` : null,
    values.skillsReqImportance === "must" && skills.length ? `Навыки: ${skills.join(", ")}` : null,
    values.eduReqImportance === "must" ? `Образование: ${values.eduReq}` : null,
    values.langReqImportance === "must" && values.langReq.length ? `Языки: ${selectedList(values.langReq, values.langReqOther).join(", ")}` : null,
    values.ageReqImportance === "must" ? `Возраст: ${values.ageReq}` : null,
    values.genderReqImportance === "must" ? `Пол: ${values.genderReq}` : null
  ].filter(Boolean).join("; ");

  function setValue<K extends keyof VacancyState>(key: K, value: VacancyState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "skillsReq" | "langReq", value: string) {
    setValues((current) => {
      const list = current[key];
      return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  function canGoNext() {
    if (step === 0) return Boolean(employer && values.companyName.trim());
    if (step === 1) return Boolean(role);
    if (step === 2) return Boolean(values.duties.trim() && values.employment && values.workFormat && values.schedule);
    if (step === 3) return Boolean(values.payFormat && values.salaryRange.trim() && values.payFrequency);
    if (step === 5) return Boolean(values.location.trim() && values.contact.trim());
    return true;
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !canGoNext()) return;
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  return (
    <section ref={quizRef} className="quiz-shell border-[#E4E4E1] bg-white" data-quiz-root>
      <div className="quiz-header bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Шаг {step + 1} из {steps.length}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{submitLabel ? "Редактировать вакансию" : "Разместить вакансию"}</h2>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Вакансия от работодателя</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form action={action} className="quiz-body bg-white">
        <input type="hidden" name="kind" value="VACANCY" />
        <input type="hidden" name="listingTemplate" value="vacancy-specialist-v1" />
        {listingId && <input type="hidden" name="listingId" value={listingId} />}
        <input type="hidden" name="vacancyRole" value={role} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="employmentType" value={vacancyEmploymentType(values.workFormat)} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="geoCode" value={values.workFormat === "Удалённо" ? "remote" : ""} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="priceComment" value={payComment} />
        <input type="hidden" name="schedule" value={`${values.employment}; ${values.workFormat}; ${values.schedule}`} />
        <input type="hidden" name="workload" value={values.employment} />
        <input type="hidden" name="requirements" value={requirements} />
        <input type="hidden" name="benefits" value={`Работодатель: ${employer}`} />
        <input type="hidden" name="benefits" value={`Компания: ${values.companyName}`} />
        <input type="hidden" name="benefitsOther" value={[values.aboutCompany, values.website ? `Сайт/соцсети: ${values.website}` : ""].filter(Boolean).join("\n")} />
        <input type="hidden" name="stopConditions" value={mustCriteria} />
        <input type="hidden" name="contact" value={values.contact} />
        <input type="hidden" name="description" value={values.duties} />

        <div className="quiz-content space-y-4">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Кто публикует вакансию?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Это покажет соискателям, куда именно они откликаются.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Кто публикует</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.employerTypes.map((option) => (
                    <VacancyChip key={option} active={values.employerType === option} onClick={() => setValue("employerType", option)}>
                      {option}
                    </VacancyChip>
                  ))}
                </div>
                {values.employerType === "Другое" && <VacancyTextInput className="mt-3" value={values.employerTypeOther} onChange={(event) => setValue("employerTypeOther", event.target.value)} placeholder="Уточните, кто публикует вакансию" />}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Название студии/бренда</p>
                <VacancyTextInput value={values.companyName} onChange={(event) => setValue("companyName", event.target.value)} placeholder="Например: StarCam Studio" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Какая вакансия?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Выберите должность. Вакансии для моделей здесь не размещаем.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {vacancyQuizOptions.positions.map((option) => (
                  <VacancyChip key={option} active={values.position === option} onClick={() => setValue("position", option)}>
                    {option}
                  </VacancyChip>
                ))}
              </div>
              {values.position === "Другое" && <VacancyTextInput value={values.positionOther} onChange={(event) => setValue("positionOther", event.target.value)} placeholder="Уточните должность" />}
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Уточнение к должности</p>
                <VacancyTextInput value={values.positionDetail} onChange={(event) => setValue("positionDetail", event.target.value)} placeholder="Например: администратор ночной смены" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Описание и формат работы</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Обязанности</p>
                <VacancyTextArea value={values.duties} onChange={(event) => setValue("duties", event.target.value)} placeholder="Кратко опишите, чем будет заниматься сотрудник" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Занятость</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.employment.map((option) => <VacancyChip key={option} active={values.employment === option} onClick={() => setValue("employment", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат работы</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.workFormats.map((option) => <VacancyChip key={option} active={values.workFormat === option} onClick={() => setValue("workFormat", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">График</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.schedules.map((option) => <VacancyChip key={option} active={values.schedule === option} onClick={() => setValue("schedule", option)}>{option}</VacancyChip>)}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Оплата</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.payFormats.map((option) => <VacancyChip key={option} active={values.payFormat === option} onClick={() => setValue("payFormat", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Вилка зарплаты</p>
                <VacancyTextInput value={values.salaryRange} onChange={(event) => setValue("salaryRange", event.target.value)} placeholder="Например: 70 000–110 000 ₽ в месяц" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Периодичность выплат</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.payFrequencies.map((option) => <VacancyChip key={option} active={values.payFrequency === option} onClick={() => setValue("payFrequency", option)}>{option}</VacancyChip>)}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Требования к кандидату</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Отметьте, что обязательно, а что просто пожелание.</p>
              </div>
              {[
                ["expReq", "Опыт работы", vacancyQuizOptions.experience],
                ["eduReq", "Образование", vacancyQuizOptions.education],
                ["ageReq", "Возраст кандидата", vacancyQuizOptions.age],
                ["genderReq", "Пол кандидата", vacancyQuizOptions.gender]
              ].map(([field, label, options]) => (
                <div key={field as string} className="rounded-xl border border-zinc-200 p-3">
                  <p className="mb-2 text-sm font-bold text-zinc-700">{label as string}</p>
                  <div className="flex flex-wrap gap-2">
                    {(options as string[]).map((option) => (
                      <VacancyChip key={option} active={values[field as keyof VacancyState] === option} onClick={() => setValue(field as keyof VacancyState, option as never)}>
                        {option}
                      </VacancyChip>
                    ))}
                  </div>
                  <ImportancePicker value={values[`${field}Importance` as keyof VacancyState] as string} onChange={(next) => setValue(`${field}Importance` as keyof VacancyState, next as never)} />
                  {field === "genderReq" && <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Проверьте требования к найму в своем регионе: для не-модельных позиций обязательный пол кандидата может быть юридически ограничен.</p>}
                </div>
              ))}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Навыки</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.skills.map((option) => <VacancyChip key={option} active={values.skillsReq.includes(option)} onClick={() => toggleList("skillsReq", option)}>{option}</VacancyChip>)}
                </div>
                {values.skillsReq.includes("Другое") && <VacancyTextInput className="mt-3" value={values.skillsReqOther} onChange={(event) => setValue("skillsReqOther", event.target.value)} placeholder="Уточните навык" />}
                <ImportancePicker value={values.skillsReqImportance} onChange={(next) => setValue("skillsReqImportance", next)} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Языки</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.languages.map((option) => <VacancyChip key={option} active={values.langReq.includes(option)} onClick={() => toggleList("langReq", option)}>{option}</VacancyChip>)}
                </div>
                {values.langReq.includes("Другой") && <VacancyTextInput className="mt-3" value={values.langReqOther} onChange={(event) => setValue("langReqOther", event.target.value)} placeholder="Уточните язык" />}
                <ImportancePicker value={values.langReqImportance} onChange={(next) => setValue("langReqImportance", next)} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">О работодателе</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Расскажите о себе и оставьте контакт для отклика.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Локация</p>
                <VacancyTextInput value={values.location} onChange={(event) => setValue("location", event.target.value)} placeholder="Город / онлайн" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">О компании</p>
                <VacancyTextArea value={values.aboutCompany} onChange={(event) => setValue("aboutCompany", event.target.value)} placeholder="Кратко расскажите о студии/бренде" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Сайт/соцсети</p>
                <VacancyTextInput value={values.website} onChange={(event) => setValue("website", event.target.value)} placeholder="Ссылка на сайт или соцсети" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Контакт для отклика</p>
                <VacancyTextInput value={values.contact} onChange={(event) => setValue("contact", event.target.value)} placeholder="Telegram, например @username" />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Вакансия готова</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Проверьте данные перед публикацией.</p>
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Вакансия</p>
                <VacancySummaryRow label="Работодатель" value={employer} />
                <VacancySummaryRow label="Бренд" value={values.companyName} />
                <VacancySummaryRow label="Должность" value={role} />
                <VacancySummaryRow label="Название" value={title} />
                <VacancySummaryRow label="Формат" value={`${values.employment}; ${values.workFormat}; ${values.schedule}`} />
                <VacancySummaryRow label="Оплата" value={price} />
                <VacancySummaryRow label="Локация" value={city} />
                <VacancySummaryRow label="Контакт" value={values.contact} />
              </div>
              {mustCriteria && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold leading-6 text-[#7A2614]">
                  <p className="mb-1 text-xs uppercase tracking-[0.12em]">Жесткие фильтры</p>
                  {mustCriteria}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="quiz-footer">
          <button className="quiz-back" type="button" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            Назад
          </button>
          {step < steps.length - 1 ? (
            <button className="quiz-next" type="button" onClick={() => goToStep(step + 1)}>
              {step === 0 ? "Начать" : step === steps.length - 2 ? "Посмотреть вакансию" : "Далее"}
            </button>
          ) : (
            <FormSubmitButton className="quiz-next bg-hot" pendingText={submitLabel ? "Сохраняем..." : "Публикуем..."}>
              {submitLabel ?? "Опубликовать вакансию"}
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}

function serviceEmploymentType(format: string) {
  if (format === "Очно") return "OFFICE";
  if (format === "Без разницы") return "HYBRID";
  return "REMOTE";
}

function ServiceSummaryRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex gap-3 border-b border-zinc-100 py-2 text-sm">
      <span className="min-w-28 shrink-0 text-zinc-500">
        {label}
        {badge === "must" && <span className="ml-1.5 inline-block rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-[#C13A1E]">обязательно</span>}
        {badge === "nice" && <span className="ml-1.5 inline-block rounded-md bg-yellow-50 px-1.5 py-0.5 text-[11px] font-bold text-[#8A6700]">желательно</span>}
      </span>
      <span className="font-semibold text-ink">{value || "—"}</span>
    </div>
  );
}

function ServiceWizard({ action, initialValues, listingId, submitLabel }: Omit<ListingQuizFormProps, "kind">) {
  const [step, setStep] = useState(0);
  const quizRef = useRef<HTMLElement | null>(null);
  const [v, setV] = useState<ServiceState>(() => ({
    audience: stringValue(initialValues, "audience", ""),
    category: stringValue(initialValues, "serviceCategory", ""),
    categoryOther: "",
    serviceName: stringValue(initialValues, "title", ""),
    serviceDesc: stringValue(initialValues, "serviceIncludes", ""),
    formatService: stringValue(initialValues, "formatService", ""),
    duration: stringValue(initialValues, "duration", ""),
    guarantee: stringValue(initialValues, "guarantee", ""),
    payFormat: stringValue(initialValues, "payFormat", ""),
    priceInput: stringValue(initialValues, "price", ""),
    payMethods: arrayValue(initialValues, "payMethods"),
    prepay: stringValue(initialValues, "prepay", ""),
    prepayImportance: stringValue(initialValues, "prepayImportance", ""),
    minOrder: stringValue(initialValues, "minOrder", ""),
    minOrderImportance: stringValue(initialValues, "minOrderImportance", ""),
    access: arrayValue(initialValues, "access"),
    accessImportance: stringValue(initialValues, "accessImportance", ""),
    nda: stringValue(initialValues, "nda", ""),
    ndaImportance: stringValue(initialValues, "ndaImportance", ""),
    providerType: stringValue(initialValues, "providerType", ""),
    providerExp: stringValue(initialValues, "providerExp", ""),
    portfolio: stringValue(initialValues, "portfolio", ""),
    contact: stringValue(initialValues, "contact", ""),
    city: stringValue(initialValues, "city", "Удаленно"),
    quickWishes: arrayValue(initialValues, "quickWishes"),
    wishesText: stringValue(initialValues, "wishesText", ""),
  }));

  const steps = serviceQuizSteps;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const categoryValue = v.category === "Другое" ? v.categoryOther.trim() || "Другое" : v.category;
  const title = v.serviceName.trim() || categoryValue;
  const price = [v.payFormat, v.priceInput].filter(Boolean).join(": ") || "Договорная";

  const reqFields: [string, string, string, string][] = [
    ["prepay", "Предоплата", v.prepay, v.prepayImportance],
    ["minOrder", "Мин. объём заказа", v.minOrder, v.minOrderImportance],
    ["access", "Нужны доступы/данные", v.access.join(", "), v.accessImportance],
    ["nda", "Конфиденциальность", v.nda, v.ndaImportance],
  ];

  const mustCriteria = reqFields
    .filter(([, , , imp]) => imp === "must")
    .map(([, label, val]) => `${label}: ${val || "—"}`)
    .join("; ");

  function set<K extends keyof ServiceState>(key: K, value: ServiceState[K]) {
    setV((c) => ({ ...c, [key]: value }));
  }

  function toggleList(key: "payMethods" | "access" | "quickWishes", value: string) {
    setV((c) => {
      const list = c[key];
      return { ...c, [key]: list.includes(value) ? list.filter((i) => i !== value) : [...list, value] };
    });
  }

  function goToStep(n: number) {
    setStep(Math.max(0, Math.min(steps.length - 1, n)));
    window.setTimeout(() => quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  const descriptionParts = [
    structuredField("Для кого", v.audience),
    structuredField("Категория", categoryValue),
    structuredField("Что входит", v.serviceDesc),
    structuredField("Формат оказания", v.formatService),
    structuredField("Срок выполнения", v.duration),
    structuredField("Гарантии", v.guarantee),
    structuredField("Формат оплаты", v.payFormat),
    structuredField("Цена", v.priceInput),
    structuredField("Способ оплаты", v.payMethods.join(", ")),
    ...reqFields.map(([, label, val, imp]) =>
      structuredField(label, val ? `${val}${imp ? ` (${importanceText[imp] || ""})` : ""}` : "")
    ),
    structuredField("Тип исполнителя", v.providerType),
    structuredField("Опыт", v.providerExp),
    structuredField("Портфолио", v.portfolio),
    structuredField("Город", v.city),
    v.quickWishes.length ? structuredField("Бонусы", v.quickWishes.join(", ")) : "",
    structuredField("Дополнительно", v.wishesText),
    structuredField("Кто не подойдет", mustCriteria),
  ].filter(Boolean).join("\n\n");

  return (
    <section ref={quizRef} className="quiz-shell border-[#E4E4E1] bg-white" data-quiz-root>
      <div className="quiz-header bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-hot">Шаг {step + 1} из {steps.length}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{submitLabel ? "Редактировать услугу" : "Предложить услугу"}</h2>
          </div>
          <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">бесплатно</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form action={action} className="quiz-body bg-white">
        <input type="hidden" name="kind" value="SERVICE" />
        <input type="hidden" name="listingTemplate" value="service-v2" />
        {listingId && <input type="hidden" name="listingId" value={listingId} />}
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="serviceCategory" value={categoryValue} />
        <input type="hidden" name="employmentType" value={serviceEmploymentType(v.formatService)} />
        <input type="hidden" name="city" value={v.city} />
        <input type="hidden" name="geoCode" value={v.formatService === "Удалённо" || v.city === "Удаленно" ? "remote" : ""} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="contact" value={v.contact} />
        <input type="hidden" name="description" value={descriptionParts} />
        <input type="hidden" name="audience" value={v.audience} />
        <input type="hidden" name="serviceIncludes" value={v.serviceDesc} />
        <input type="hidden" name="formatService" value={v.formatService} />
        <input type="hidden" name="duration" value={v.duration} />
        <input type="hidden" name="guarantee" value={v.guarantee} />
        <input type="hidden" name="payFormat" value={v.payFormat} />
        <input type="hidden" name="priceComment" value={v.priceInput} />
        <input type="hidden" name="payMethods" value={v.payMethods.join(", ")} />
        <input type="hidden" name="prepay" value={v.prepay} />
        <input type="hidden" name="prepayImportance" value={v.prepayImportance} />
        <input type="hidden" name="minOrder" value={v.minOrder} />
        <input type="hidden" name="minOrderImportance" value={v.minOrderImportance} />
        <input type="hidden" name="access" value={v.access.join(", ")} />
        <input type="hidden" name="accessImportance" value={v.accessImportance} />
        <input type="hidden" name="nda" value={v.nda} />
        <input type="hidden" name="ndaImportance" value={v.ndaImportance} />
        <input type="hidden" name="providerType" value={v.providerType} />
        <input type="hidden" name="providerExp" value={v.providerExp} />
        <input type="hidden" name="portfolio" value={v.portfolio} />
        <input type="hidden" name="quickWishes" value={v.quickWishes.join(", ")} />
        <input type="hidden" name="wishesText" value={v.wishesText} />
        <input type="hidden" name="stopConditions" value={mustCriteria} />
        <input type="hidden" name="experience" value={v.providerExp} />
        <input type="hidden" name="deliveryTime" value={v.duration} />
        <input type="hidden" name="availability" value={v.formatService} />
        <input type="hidden" name="portfolioUrl" value={v.portfolio} />

        <div className="quiz-content space-y-4">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Предложить услугу</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Опубликуй услугу для моделей и студий — от продвижения профиля до вывода токенов. Сначала укажи, кому она адресована.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Для кого услуга</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.audiences.map((o) => (
                    <VacancyChip key={o} active={v.audience === o} onClick={() => set("audience", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Какая услуга</h3>
              <p className="-mt-3 text-sm leading-6 text-zinc-600">Выбери категорию и кратко назови услугу</p>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Категория</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.categories.map((o) => (
                    <VacancyChip key={o} active={v.category === o} onClick={() => set("category", o)}>{o}</VacancyChip>
                  ))}
                </div>
                {v.category === "Другое" && (
                  <VacancyTextInput className="mt-3" value={v.categoryOther} onChange={(e) => set("categoryOther", e.target.value)} placeholder="Уточни категорию" />
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Название услуги</p>
                <VacancyTextInput value={v.serviceName} onChange={(e) => set("serviceName", e.target.value)} placeholder="Например: накрутка лайков на Chaturbate" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Описание услуги</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Что входит в услугу</p>
                <VacancyTextArea value={v.serviceDesc} onChange={(e) => set("serviceDesc", e.target.value)} placeholder="Опиши, как именно оказывается услуга и что получит заказчик" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат оказания</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.formats.map((o) => (
                    <VacancyChip key={o} active={v.formatService === o} onClick={() => set("formatService", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Город</p>
                <select className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-hot" value={v.city} onChange={(e) => set("city", e.target.value)}>
                  {serviceQuizOptions.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Срок выполнения</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.durations.map((o) => (
                    <VacancyChip key={o} active={v.duration === o} onClick={() => set("duration", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Гарантии</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.guarantees.map((o) => (
                    <VacancyChip key={o} active={v.guarantee === o} onClick={() => set("guarantee", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Стоимость</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.payFormats.map((o) => (
                    <VacancyChip key={o} active={v.payFormat === o} onClick={() => set("payFormat", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Цена</p>
                <VacancyTextInput value={v.priceInput} onChange={(e) => set("priceInput", e.target.value)} placeholder="Например: от 500₽ за 1000 лайков" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Способ оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.payMethods.map((o) => (
                    <VacancyChip key={o} active={v.payMethods.includes(o)} onClick={() => toggleList("payMethods", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Условия для заказчика</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Отметь, что обязательно, а что просто пожелание</p>
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Предоплата</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.prepayOptions.map((o) => (
                    <VacancyChip key={o} active={v.prepay === o} onClick={() => set("prepay", o)}>{o}</VacancyChip>
                  ))}
                </div>
                <ImportancePicker value={v.prepayImportance} onChange={(n) => set("prepayImportance", n)} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Минимальный объём заказа</p>
                <VacancyTextInput value={v.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="Например: от 10 000 токенов" />
                <ImportancePicker value={v.minOrderImportance} onChange={(n) => set("minOrderImportance", n)} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Нужны доступы/данные</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.accessOptions.map((o) => (
                    <VacancyChip key={o} active={v.access.includes(o)} onClick={() => toggleList("access", o)}>{o}</VacancyChip>
                  ))}
                </div>
                <ImportancePicker value={v.accessImportance} onChange={(n) => set("accessImportance", n)} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Конфиденциальность</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.ndaOptions.map((o) => (
                    <VacancyChip key={o} active={v.nda === o} onClick={() => set("nda", o)}>{o}</VacancyChip>
                  ))}
                </div>
                <ImportancePicker value={v.ndaImportance} onChange={(n) => set("ndaImportance", n)} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Об исполнителе</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Кто оказывает услугу</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.providerTypes.map((o) => (
                    <VacancyChip key={o} active={v.providerType === o} onClick={() => set("providerType", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Опыт</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.experienceLevels.map((o) => (
                    <VacancyChip key={o} active={v.providerExp === o} onClick={() => set("providerExp", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Портфолио/примеры работ (необязательно)</p>
                <VacancyTextInput value={v.portfolio} onChange={(e) => set("portfolio", e.target.value)} placeholder="Ссылка на примеры или отзывы" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Контакт для связи</p>
                <VacancyTextInput value={v.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Telegram, например @username" />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Дополнительная информация</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Необязательный шаг — можно пропустить</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Быстрый выбор</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.quickWishes.map((o) => (
                    <VacancyChip key={o} active={v.quickWishes.includes(o)} onClick={() => toggleList("quickWishes", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Своими словами</p>
                <VacancyTextArea value={v.wishesText} onChange={(e) => set("wishesText", e.target.value)} placeholder="Что ещё важно знать заказчику об услуге или о тебе" />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Объявление готово</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Проверь перед публикацией</p>
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Услуга</p>
                <ServiceSummaryRow label="Для кого" value={v.audience} />
                <ServiceSummaryRow label="Категория" value={categoryValue} />
                <ServiceSummaryRow label="Название" value={v.serviceName} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Описание</p>
                <ServiceSummaryRow label="Что входит" value={v.serviceDesc} />
                <ServiceSummaryRow label="Формат" value={v.formatService} />
                <ServiceSummaryRow label="Город" value={v.city} />
                <ServiceSummaryRow label="Срок" value={v.duration} />
                <ServiceSummaryRow label="Гарантии" value={v.guarantee} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Стоимость</p>
                <ServiceSummaryRow label="Формат оплаты" value={v.payFormat} />
                <ServiceSummaryRow label="Цена" value={v.priceInput} />
                <ServiceSummaryRow label="Способ оплаты" value={v.payMethods.join(", ")} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Условия для заказчика</p>
                {reqFields.map(([key, label, val, imp]) => (
                  <ServiceSummaryRow key={key} label={label} value={val || "—"} badge={imp} />
                ))}
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Об исполнителе</p>
                <ServiceSummaryRow label="Тип" value={v.providerType} />
                <ServiceSummaryRow label="Опыт" value={v.providerExp} />
                <ServiceSummaryRow label="Портфолио" value={v.portfolio} />
                <ServiceSummaryRow label="Контакт" value={v.contact} />
              </div>
              {(v.wishesText || v.quickWishes.length > 0) && (
                <div className="rounded-xl border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Доп. информация</p>
                  {v.quickWishes.length > 0 && <ServiceSummaryRow label="Выбрано" value={v.quickWishes.join(", ")} />}
                  {v.wishesText && <ServiceSummaryRow label="Текст" value={v.wishesText} />}
                </div>
              )}
              {mustCriteria && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold leading-6 text-[#7A2614]">
                  <p className="mb-1 text-xs uppercase tracking-[0.12em]">🔴 Жёсткие условия для заказа</p>
                  {mustCriteria}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="quiz-footer">
          <button className="quiz-back" type="button" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            Назад
          </button>
          {step < steps.length - 1 ? (
            <button className="quiz-next" type="button" onClick={() => goToStep(step + 1)}>
              {step === 0 ? "Начать" : step === steps.length - 2 ? "Посмотреть объявление" : "Далее"}
            </button>
          ) : (
            <FormSubmitButton className="quiz-next bg-hot" pendingText={submitLabel ? "Сохраняем..." : "Публикуем..."}>
              {submitLabel ?? "Опубликовать услугу"}
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}

function structuredField(label: string, value: string) {
  if (!value || !value.trim()) return "";
  return `${label}: ${value.trim()}`;
}

export function ListingQuizForm({ action, kind, initialValues, listingId, submitLabel }: ListingQuizFormProps) {
  if (kind === "SERVICE") {
    return <ServiceWizard action={action} initialValues={initialValues} listingId={listingId} submitLabel={submitLabel} />;
  }
  return <VacancyWizard action={action} initialValues={initialValues} listingId={listingId} submitLabel={submitLabel} />;
}
