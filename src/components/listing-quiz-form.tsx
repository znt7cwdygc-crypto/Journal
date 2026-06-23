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

  if (!isService) {
    return <VacancyWizard action={action} initialValues={initialValues} listingId={listingId} submitLabel={submitLabel} />;
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
