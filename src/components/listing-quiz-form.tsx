"use client";

import { useRef, useState } from "react";
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

function structuredField(label: string, value: string) {
  if (!value || !value.trim()) return "";
  return `${label}: ${value.trim()}`;
}

/* ──────────────────────────────────────────────────────────────────────────────
   VACANCY WIZARD (9 steps)
   ────────────────────────────────────────────────────────────────────────── */

type VacancyState = {
  employerType: string;
  employerTypeOther: string;
  companyName: string;
  position: string;
  positionOther: string;
  workFormat: string;
  city: string;
  district: string;
  employment: string;
  duties: string;
  shiftScheme: string;
  shiftLength: string;
  workTime: string[];
  weekends: string;
  payFormat: string;
  salaryRange: string;
  payFrequency: string;
  training: string;
  provided: string[];
  bonuses: string[];
  careerGrowth: string;
  penaltySystem: string;
  additionalConditions: string;
  expReq: string;
  expReqImportance: string;
  langReq: string[];
  langReqOther: string;
  langReqImportance: string;
  genderReq: string;
  ageReq: string;
  eduReq: string;
  keySkills: string;
  aboutCompany: string;
  website: string;
  contactPerson: string;
  contact: string;
};

function VacancyWizard({ action, initialValues, listingId, submitLabel }: Omit<ListingQuizFormProps, "kind">) {
  const [step, setStep] = useState(0);
  const quizRef = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<VacancyState>(() => ({
    employerType: stringValue(initialValues, "employerType", "Студия (офлайн)"),
    employerTypeOther: "",
    companyName: stringValue(initialValues, "companyName", ""),
    position: stringValue(initialValues, "vacancyRole", "Оператор чата"),
    positionOther: "",
    workFormat: reverseVacancyEmploymentType(stringValue(initialValues, "employmentType", "OFFICE")),
    city: stringValue(initialValues, "city", ""),
    district: stringValue(initialValues, "district", ""),
    employment: stringValue(initialValues, "workload", "Полная"),
    duties: stringValue(initialValues, "description", ""),
    shiftScheme: stringValue(initialValues, "shiftScheme", "2/2"),
    shiftLength: stringValue(initialValues, "shiftLength", "8ч"),
    workTime: arrayValue(initialValues, "workTime"),
    weekends: stringValue(initialValues, "weekends", "Плавающие"),
    payFormat: stringValue(initialValues, "payFormat", "Оклад"),
    salaryRange: stringValue(initialValues, "price", ""),
    payFrequency: stringValue(initialValues, "payFrequency", "2 раза в мес"),
    training: stringValue(initialValues, "training", "Бесплатное"),
    provided: arrayValue(initialValues, "provided"),
    bonuses: arrayValue(initialValues, "bonuses"),
    careerGrowth: stringValue(initialValues, "careerGrowth", ""),
    penaltySystem: stringValue(initialValues, "penaltySystem", ""),
    additionalConditions: stringValue(initialValues, "additionalConditions", ""),
    expReq: stringValue(initialValues, "expReq", "Без опыта"),
    expReqImportance: stringValue(initialValues, "expReqImportance", "nice"),
    langReq: arrayValue(initialValues, "langReq").length ? arrayValue(initialValues, "langReq") : ["Русский"],
    langReqOther: "",
    langReqImportance: stringValue(initialValues, "langReqImportance", "nice"),
    genderReq: stringValue(initialValues, "genderReq", "Не важно"),
    ageReq: stringValue(initialValues, "ageReq", "18+"),
    eduReq: stringValue(initialValues, "eduReq", "Не важно"),
    keySkills: stringValue(initialValues, "keySkills", ""),
    aboutCompany: stringValue(initialValues, "benefitsOther", ""),
    website: stringValue(initialValues, "website", ""),
    contactPerson: stringValue(initialValues, "contactPerson", ""),
    contact: stringValue(initialValues, "contact", ""),
  }));

  const steps = vacancyQuizSteps;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const role = selectedValue(values.position, values.positionOther);
  const employer = selectedValue(values.employerType, values.employerTypeOther);
  const title = `${role} в ${values.companyName.trim() || "студию"}`;
  const city = values.city.trim() || (values.workFormat === "Удалённо" ? "Удаленно" : "");
  const price = [values.payFormat, values.salaryRange].filter(Boolean).join(": ") || "Договорная";
  const payComment = values.payFrequency ? `Выплаты: ${values.payFrequency}` : "";
  const langs = selectedList(values.langReq, values.langReqOther);

  const requirements = [
    `Опыт работы: ${values.expReq} (${importanceText[values.expReqImportance]})`,
    langs.length ? `Языки: ${langs.join(", ")} (${importanceText[values.langReqImportance]})` : null,
    `Пол: ${values.genderReq}`,
    `Возраст: ${values.ageReq}`,
    `Образование: ${values.eduReq}`,
    values.keySkills.trim() ? `Навыки: ${values.keySkills.trim()}` : null,
  ].filter(Boolean).join("\n");

  const mustCriteria = [
    values.expReqImportance === "must" ? `Опыт: ${values.expReq}` : null,
    values.langReqImportance === "must" && langs.length ? `Языки: ${langs.join(", ")}` : null,
  ].filter(Boolean).join("; ");

  const schedule = [values.shiftScheme, values.shiftLength, values.workTime.join(", "), values.weekends].filter(Boolean).join("; ");
  const conditions = [
    values.training ? `Обучение: ${values.training}` : "",
    values.provided.length ? `Предоставляется: ${values.provided.join(", ")}` : "",
    values.bonuses.length ? `Бонусы: ${values.bonuses.join(", ")}` : "",
    values.careerGrowth ? `Рост: ${values.careerGrowth}` : "",
    values.penaltySystem ? `Штрафы: ${values.penaltySystem}` : "",
    values.additionalConditions.trim() || "",
  ].filter(Boolean).join("\n");

  function setValue<K extends keyof VacancyState>(key: K, value: VacancyState[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "workTime" | "langReq" | "provided" | "bonuses", value: string) {
    setValues((current) => {
      const list = current[key];
      return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  function canGoNext() {
    if (step === 0) return Boolean(values.employerType && values.companyName.trim());
    if (step === 1) return Boolean(role);
    if (step === 2) return Boolean(values.workFormat && values.employment && values.duties.trim());
    if (step === 3) return true;
    if (step === 4) return Boolean(values.payFormat && values.salaryRange.trim() && values.payFrequency);
    if (step === 7) return Boolean(values.contact.trim());
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
        <input type="hidden" name="district" value={values.district} />
        <input type="hidden" name="geoCode" value={values.workFormat === "Удалённо" ? "remote" : ""} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="priceComment" value={payComment} />
        <input type="hidden" name="schedule" value={schedule} />
        <input type="hidden" name="workload" value={values.employment} />
        <input type="hidden" name="requirements" value={requirements} />
        <input type="hidden" name="benefits" value={`Работодатель: ${employer}`} />
        <input type="hidden" name="benefitsOther" value={[values.aboutCompany, values.website ? `Сайт/соцсети: ${values.website}` : ""].filter(Boolean).join("\n")} />
        <input type="hidden" name="conditions" value={conditions} />
        <input type="hidden" name="stopConditions" value={mustCriteria} />
        <input type="hidden" name="contact" value={values.contact} />
        <input type="hidden" name="contactPerson" value={values.contactPerson} />
        <input type="hidden" name="description" value={values.duties} />
        <input type="hidden" name="companyName" value={values.companyName} />
        <input type="hidden" name="employerType" value={employer} />
        <input type="hidden" name="shiftScheme" value={values.shiftScheme} />
        <input type="hidden" name="shiftLength" value={values.shiftLength} />
        <input type="hidden" name="workTime" value={values.workTime.join(", ")} />
        <input type="hidden" name="weekends" value={values.weekends} />
        <input type="hidden" name="payFormat" value={values.payFormat} />
        <input type="hidden" name="payFrequency" value={values.payFrequency} />
        <input type="hidden" name="training" value={values.training} />
        <input type="hidden" name="provided" value={values.provided.join(", ")} />
        <input type="hidden" name="bonuses" value={values.bonuses.join(", ")} />
        <input type="hidden" name="careerGrowth" value={values.careerGrowth} />
        <input type="hidden" name="penaltySystem" value={values.penaltySystem} />
        <input type="hidden" name="additionalConditions" value={values.additionalConditions} />
        <input type="hidden" name="expReq" value={values.expReq} />
        <input type="hidden" name="expReqImportance" value={values.expReqImportance} />
        <input type="hidden" name="langReq" value={values.langReq.join(", ")} />
        <input type="hidden" name="langReqImportance" value={values.langReqImportance} />
        <input type="hidden" name="genderReq" value={values.genderReq} />
        <input type="hidden" name="ageReq" value={values.ageReq} />
        <input type="hidden" name="eduReq" value={values.eduReq} />
        <input type="hidden" name="keySkills" value={values.keySkills} />
        <input type="hidden" name="website" value={values.website} />

        <div className="quiz-content space-y-4">
          {/* Step 0: Работодатель */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Кто публикует вакансию?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Это покажет соискателям, куда именно они откликаются.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Тип работодателя</p>
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

          {/* Step 1: Должность */}
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
            </div>
          )}

          {/* Step 2: О вакансии */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">О вакансии</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат работы</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.workFormat.map((option) => <VacancyChip key={option} active={values.workFormat === option} onClick={() => setValue("workFormat", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              {(values.workFormat === "Очно" || values.workFormat === "Гибридный") && (
                <div>
                  <p className="mb-2 text-sm font-bold text-zinc-700">Город</p>
                  <VacancyTextInput value={values.city} onChange={(event) => setValue("city", event.target.value)} placeholder="Например: Москва" />
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Район/адрес</p>
                <VacancyTextInput value={values.district} onChange={(event) => setValue("district", event.target.value)} placeholder="Район или адрес (необязательно)" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Занятость</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.employment.map((option) => <VacancyChip key={option} active={values.employment === option} onClick={() => setValue("employment", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Обязанности</p>
                <VacancyTextArea value={values.duties} onChange={(event) => setValue("duties", event.target.value)} placeholder="Кратко опишите, чем будет заниматься сотрудник" />
              </div>
            </div>
          )}

          {/* Step 3: График */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">График работы</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Сменный график</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.shiftSchemes.map((option) => <VacancyChip key={option} active={values.shiftScheme === option} onClick={() => setValue("shiftScheme", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Длительность смены</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.shiftLength.map((option) => <VacancyChip key={option} active={values.shiftLength === option} onClick={() => setValue("shiftLength", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Время работы</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.workTime.map((option) => <VacancyChip key={option} active={values.workTime.includes(option)} onClick={() => toggleList("workTime", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Выходные</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.weekends.map((option) => <VacancyChip key={option} active={values.weekends === option} onClick={() => setValue("weekends", option)}>{option}</VacancyChip>)}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Оплата */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Оплата</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.payFormat.map((option) => <VacancyChip key={option} active={values.payFormat === option} onClick={() => setValue("payFormat", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Вилка зарплаты</p>
                <VacancyTextInput value={values.salaryRange} onChange={(event) => setValue("salaryRange", event.target.value)} placeholder="Например: 70 000-110 000 в месяц" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Периодичность выплат</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.payFrequency.map((option) => <VacancyChip key={option} active={values.payFrequency === option} onClick={() => setValue("payFrequency", option)}>{option}</VacancyChip>)}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Условия */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Условия работы</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Обучение</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.training.map((option) => <VacancyChip key={option} active={values.training === option} onClick={() => setValue("training", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Что предоставляется</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.provided.map((option) => <VacancyChip key={option} active={values.provided.includes(option)} onClick={() => toggleList("provided", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Бонусы/KPI</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.bonuses.map((option) => <VacancyChip key={option} active={values.bonuses.includes(option)} onClick={() => toggleList("bonuses", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Карьерный рост</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.careerGrowth.map((option) => <VacancyChip key={option} active={values.careerGrowth === option} onClick={() => setValue("careerGrowth", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Система штрафов</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.penaltySystem.map((option) => <VacancyChip key={option} active={values.penaltySystem === option} onClick={() => setValue("penaltySystem", option)}>{option}</VacancyChip>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Дополнительные условия</p>
                <VacancyTextArea value={values.additionalConditions} onChange={(event) => setValue("additionalConditions", event.target.value)} placeholder="Что ещё важно знать кандидату (необязательно)" />
              </div>
            </div>
          )}

          {/* Step 6: Требования */}
          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Требования к кандидату</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Укажите требования к кандидату.</p>
              </div>
              {/* Experience - with importance */}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Опыт работы</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.experience.map((option) => (
                    <VacancyChip key={option} active={values.expReq === option} onClick={() => setValue("expReq", option)}>{option}</VacancyChip>
                  ))}
                </div>
                <ImportancePicker value={values.expReqImportance} onChange={(next) => setValue("expReqImportance", next)} />
              </div>
              {/* Languages - with importance */}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Знание языков</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.languages.map((option) => <VacancyChip key={option} active={values.langReq.includes(option)} onClick={() => toggleList("langReq", option)}>{option}</VacancyChip>)}
                </div>
                {values.langReq.includes("Другой") && <VacancyTextInput className="mt-3" value={values.langReqOther} onChange={(event) => setValue("langReqOther", event.target.value)} placeholder="Уточните язык" />}
                <ImportancePicker value={values.langReqImportance} onChange={(next) => setValue("langReqImportance", next)} />
              </div>
              {/* Gender - no importance */}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Пол кандидата</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.gender.map((option) => (
                    <VacancyChip key={option} active={values.genderReq === option} onClick={() => setValue("genderReq", option)}>{option}</VacancyChip>
                  ))}
                </div>
                <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Проверьте требования к найму в своем регионе: для не-модельных позиций обязательный пол кандидата может быть юридически ограничен.</p>
              </div>
              {/* Age - no importance */}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Возраст кандидата</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.age.map((option) => (
                    <VacancyChip key={option} active={values.ageReq === option} onClick={() => setValue("ageReq", option)}>{option}</VacancyChip>
                  ))}
                </div>
              </div>
              {/* Education - no importance */}
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-sm font-bold text-zinc-700">Образование</p>
                <div className="flex flex-wrap gap-2">
                  {vacancyQuizOptions.education.map((option) => (
                    <VacancyChip key={option} active={values.eduReq === option} onClick={() => setValue("eduReq", option)}>{option}</VacancyChip>
                  ))}
                </div>
              </div>
              {/* Key skills textarea */}
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Ключевые навыки</p>
                <VacancyTextArea value={values.keySkills} onChange={(event) => setValue("keySkills", event.target.value)} placeholder="Перечислите навыки, важные для работы" />
              </div>
            </div>
          )}

          {/* Step 7: Контакты */}
          {step === 7 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Контакты</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Расскажите о компании и оставьте контакт для отклика.</p>
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
                <p className="mb-2 text-sm font-bold text-zinc-700">Контактное лицо</p>
                <VacancyTextInput value={values.contactPerson} onChange={(event) => setValue("contactPerson", event.target.value)} placeholder="Имя контактного лица (необязательно)" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Контакт для отклика</p>
                <VacancyTextInput value={values.contact} onChange={(event) => setValue("contact", event.target.value)} placeholder="Telegram, например @username" />
              </div>
            </div>
          )}

          {/* Step 8: Проверка */}
          {step === 8 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Вакансия готова</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Проверьте данные перед публикацией.</p>
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Работодатель</p>
                <VacancySummaryRow label="Тип" value={employer} />
                <VacancySummaryRow label="Компания" value={values.companyName} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Вакансия</p>
                <VacancySummaryRow label="Должность" value={role} />
                <VacancySummaryRow label="Формат" value={values.workFormat} />
                <VacancySummaryRow label="Город" value={city} />
                {values.district && <VacancySummaryRow label="Район/адрес" value={values.district} />}
                <VacancySummaryRow label="Занятость" value={values.employment} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">График</p>
                <VacancySummaryRow label="Смены" value={values.shiftScheme} />
                <VacancySummaryRow label="Длительность" value={values.shiftLength} />
                <VacancySummaryRow label="Время" value={values.workTime.join(", ")} />
                <VacancySummaryRow label="Выходные" value={values.weekends} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Оплата</p>
                <VacancySummaryRow label="Формат" value={values.payFormat} />
                <VacancySummaryRow label="Зарплата" value={values.salaryRange} />
                <VacancySummaryRow label="Выплаты" value={values.payFrequency} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Условия</p>
                <VacancySummaryRow label="Обучение" value={values.training} />
                <VacancySummaryRow label="Предоставляется" value={values.provided.join(", ")} />
                <VacancySummaryRow label="Бонусы" value={values.bonuses.join(", ")} />
                <VacancySummaryRow label="Рост" value={values.careerGrowth} />
                <VacancySummaryRow label="Штрафы" value={values.penaltySystem} />
                {values.additionalConditions && <VacancySummaryRow label="Доп. условия" value={values.additionalConditions} />}
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Требования</p>
                <VacancySummaryRow label="Опыт" value={`${values.expReq} (${importanceText[values.expReqImportance]})`} />
                <VacancySummaryRow label="Языки" value={langs.length ? `${langs.join(", ")} (${importanceText[values.langReqImportance]})` : "—"} />
                <VacancySummaryRow label="Пол" value={values.genderReq} />
                <VacancySummaryRow label="Возраст" value={values.ageReq} />
                <VacancySummaryRow label="Образование" value={values.eduReq} />
                {values.keySkills.trim() && <VacancySummaryRow label="Навыки" value={values.keySkills} />}
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Контакты</p>
                <VacancySummaryRow label="Контакт" value={values.contact} />
                {values.contactPerson && <VacancySummaryRow label="Контактное лицо" value={values.contactPerson} />}
                {values.website && <VacancySummaryRow label="Сайт" value={values.website} />}
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

/* ──────────────────────────────────────────────────────────────────────────────
   SERVICE WIZARD (8 steps)
   ────────────────────────────────────────────────────────────────────────── */

type ServiceState = {
  audience: string;
  category: string;
  categoryOther: string;
  serviceName: string;
  serviceDesc: string;
  formatService: string;
  city: string;
  duration: string;
  guarantee: string;
  payFormat: string;
  priceInput: string;
  payMethods: string[];
  prepay: string;
  minOrder: string;
  freeConsultation: string;
  discounts: string[];
  providerType: string;
  providerExp: string;
  portfolio: string;
  aboutProvider: string;
  contactPerson: string;
  contact: string;
  website: string;
};

function serviceEmploymentType(format: string) {
  if (format === "Очно") return "OFFICE";
  if (format === "Смешанный") return "HYBRID";
  return "REMOTE";
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
    city: stringValue(initialValues, "city", ""),
    duration: stringValue(initialValues, "duration", ""),
    guarantee: stringValue(initialValues, "guarantee", ""),
    payFormat: stringValue(initialValues, "payFormat", ""),
    priceInput: stringValue(initialValues, "price", ""),
    payMethods: arrayValue(initialValues, "payMethods"),
    prepay: stringValue(initialValues, "prepay", ""),
    minOrder: stringValue(initialValues, "minOrder", ""),
    freeConsultation: stringValue(initialValues, "freeConsultation", ""),
    discounts: arrayValue(initialValues, "discounts"),
    providerType: stringValue(initialValues, "providerType", ""),
    providerExp: stringValue(initialValues, "providerExp", ""),
    portfolio: stringValue(initialValues, "portfolio", ""),
    aboutProvider: stringValue(initialValues, "aboutProvider", ""),
    contactPerson: stringValue(initialValues, "contactPerson", ""),
    contact: stringValue(initialValues, "contact", ""),
    website: stringValue(initialValues, "website", ""),
  }));

  const steps = serviceQuizSteps;
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const categoryValue = v.category === "Другое" ? v.categoryOther.trim() || "Другое" : v.category;
  const title = v.serviceName.trim() || categoryValue;
  const price = [v.payFormat, v.priceInput].filter(Boolean).join(": ") || "Договорная";

  function set<K extends keyof ServiceState>(key: K, value: ServiceState[K]) {
    setV((c) => ({ ...c, [key]: value }));
  }

  function toggleList(key: "payMethods" | "discounts", value: string) {
    setV((c) => {
      const list = c[key];
      return { ...c, [key]: list.includes(value) ? list.filter((i) => i !== value) : [...list, value] };
    });
  }

  function canGoNext() {
    if (step === 1) return Boolean(v.category && v.serviceName.trim());
    if (step === 2) return Boolean(v.serviceDesc.trim());
    if (step === 3) return Boolean(v.priceInput.trim());
    if (step === 6) return Boolean(v.contact.trim());
    return true;
  }

  function goToStep(n: number) {
    if (n > step && !canGoNext()) return;
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
    structuredField("Предоплата", v.prepay),
    structuredField("Мин. заказ", v.minOrder),
    structuredField("Бесплатная консультация", v.freeConsultation),
    structuredField("Скидки", v.discounts.join(", ")),
    structuredField("Тип исполнителя", v.providerType),
    structuredField("Опыт", v.providerExp),
    structuredField("Портфолио", v.portfolio),
    structuredField("Об исполнителе", v.aboutProvider),
    structuredField("Город", v.city),
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
        <input type="hidden" name="geoCode" value={v.formatService === "Удалённо" || !v.city ? "remote" : ""} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="contact" value={v.contact} />
        <input type="hidden" name="contactPerson" value={v.contactPerson} />
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
        <input type="hidden" name="minOrder" value={v.minOrder} />
        <input type="hidden" name="freeConsultation" value={v.freeConsultation} />
        <input type="hidden" name="discounts" value={v.discounts.join(", ")} />
        <input type="hidden" name="providerType" value={v.providerType} />
        <input type="hidden" name="providerExp" value={v.providerExp} />
        <input type="hidden" name="portfolio" value={v.portfolio} />
        <input type="hidden" name="aboutProvider" value={v.aboutProvider} />
        <input type="hidden" name="website" value={v.website} />
        <input type="hidden" name="experience" value={v.providerExp} />
        <input type="hidden" name="deliveryTime" value={v.duration} />
        <input type="hidden" name="availability" value={v.formatService} />
        <input type="hidden" name="portfolioUrl" value={v.portfolio} />

        <div className="quiz-content space-y-4">
          {/* Step 0: Для кого */}
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

          {/* Step 1: Категория */}
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

          {/* Step 2: Описание */}
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
                  {serviceQuizOptions.serviceFormat.map((o) => (
                    <VacancyChip key={o} active={v.formatService === o} onClick={() => set("formatService", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              {(v.formatService === "Очно" || v.formatService === "Смешанный") && (
                <div>
                  <p className="mb-2 text-sm font-bold text-zinc-700">Город</p>
                  <VacancyTextInput value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="Например: Москва" />
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Срок выполнения</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.duration.map((o) => (
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

          {/* Step 3: Стоимость */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold leading-tight text-ink">Стоимость</h3>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Формат оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.payFormat.map((o) => (
                    <VacancyChip key={o} active={v.payFormat === o} onClick={() => set("payFormat", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Цена</p>
                <VacancyTextInput value={v.priceInput} onChange={(e) => set("priceInput", e.target.value)} placeholder="Например: от 500 за 1000 лайков" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Способ оплаты</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.payMethod.map((o) => (
                    <VacancyChip key={o} active={v.payMethods.includes(o)} onClick={() => toggleList("payMethods", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Условия */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Условия для заказчика</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Укажите условия сотрудничества</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Предоплата</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.prepay.map((o) => (
                    <VacancyChip key={o} active={v.prepay === o} onClick={() => set("prepay", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Минимальный объём заказа</p>
                <VacancyTextInput value={v.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="Например: от 10 000 токенов" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Бесплатная консультация</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.freeConsultation.map((o) => (
                    <VacancyChip key={o} active={v.freeConsultation === o} onClick={() => set("freeConsultation", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Скидки</p>
                <div className="flex flex-wrap gap-2">
                  {serviceQuizOptions.discounts.map((o) => (
                    <VacancyChip key={o} active={v.discounts.includes(o)} onClick={() => toggleList("discounts", o)}>{o}</VacancyChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Исполнитель */}
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
                <p className="mb-2 text-sm font-bold text-zinc-700">О себе/команде</p>
                <VacancyTextArea value={v.aboutProvider} onChange={(e) => set("aboutProvider", e.target.value)} placeholder="Кратко расскажите о себе или команде" />
              </div>
            </div>
          )}

          {/* Step 6: Контакты */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold leading-tight text-ink">Контакты</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Оставьте контакт для связи</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Контактное лицо</p>
                <VacancyTextInput value={v.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Имя (необязательно)" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Контакт для связи</p>
                <VacancyTextInput value={v.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Telegram, например @username" />
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-zinc-700">Сайт/соцсети</p>
                <VacancyTextInput value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="Ссылка на сайт или соцсети (необязательно)" />
              </div>
            </div>
          )}

          {/* Step 7: Итог */}
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
                {v.city && <ServiceSummaryRow label="Город" value={v.city} />}
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
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Условия</p>
                <ServiceSummaryRow label="Предоплата" value={v.prepay} />
                <ServiceSummaryRow label="Мин. заказ" value={v.minOrder} />
                <ServiceSummaryRow label="Консультация" value={v.freeConsultation} />
                <ServiceSummaryRow label="Скидки" value={v.discounts.join(", ")} />
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Об исполнителе</p>
                <ServiceSummaryRow label="Тип" value={v.providerType} />
                <ServiceSummaryRow label="Опыт" value={v.providerExp} />
                <ServiceSummaryRow label="Портфолио" value={v.portfolio} />
                {v.aboutProvider && <ServiceSummaryRow label="О себе" value={v.aboutProvider} />}
              </div>
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Контакты</p>
                {v.contactPerson && <ServiceSummaryRow label="Контактное лицо" value={v.contactPerson} />}
                <ServiceSummaryRow label="Контакт" value={v.contact} />
                {v.website && <ServiceSummaryRow label="Сайт" value={v.website} />}
              </div>
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

export function ListingQuizForm({ action, kind, initialValues, listingId, submitLabel }: ListingQuizFormProps) {
  if (kind === "SERVICE") {
    return <ServiceWizard action={action} initialValues={initialValues} listingId={listingId} submitLabel={submitLabel} />;
  }
  return <VacancyWizard action={action} initialValues={initialValues} listingId={listingId} submitLabel={submitLabel} />;
}
