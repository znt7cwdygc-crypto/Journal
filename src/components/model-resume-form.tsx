"use client";

import { useMemo, useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  specialistPositions,
  specialistExperience,
  specialistEmployment,
  specialistSchedule,
  specialistIncome,
  specialistSkills,
  specialistEducation,
  specialistPayFormats,
  specialistPayFrequency,
  specialistProbation,
  specialistWorkFormat,
  specialistEquipmentNeeded,
  specialistBenefits,
  specialistManagerGender,
  specialistTeamGender,
  specialistTeamSize
} from "@/lib/quizzes/resume-quiz";

type ResumeDraft = {
  title: string;
  roleGoal: string;
  city: string | null;
  experienceMonths: number;
  contactEmail: string | null;
  contactTelegram: string | null;
};

type Importance = "must" | "nice" | "none";
type Role = "model" | "specialist";

type ModelResumeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  resume?: Partial<ResumeDraft> | null;
};

const steps = ["Роль", "О себе", "Нагрузка", "Навыки", "Деньги", "Условия", "Команда", "Пожелания", "Контакты", "Итог"];

/* ── Model options ── */
const categories = ["Соло", "Парная работа", "Групповые шоу", "Фетиш-ниши", "Мужской кам", "Трансгендерные модели", "Ролевые игры", "Другое"];
const experience = ["До 3 мес", "3-6 мес", "6-12 мес", "1-3 года", "Более 3 лет"];
const status = ["Активно ищу студию", "Рассматриваю предложения", "Пока не ищу"];
const formats = ["Только онлайн (из дома)", "Только офлайн-студия", "Любой вариант"];
const incomes = ["До $50", "$50-150", "$150-300", "$300-500", "Более $500", "Не указывать"];
const sites = ["Chaturbate", "Stripchat", "BongaCams", "MyFreeCams", "LiveJasmin", "Streamate", "CamSoda", "Flirt4Free", "Другое"];
const languages = ["Русский", "Английский", "Испанский", "Немецкий", "Французский", "Другой"];
const payFormats = ["% от токенов", "Фиксированная ставка", "Гибрид"];
const payFrequency = ["Ежедневно", "Раз в неделю", "2 раза в месяц", "Раз в месяц"];
const payMethod = ["Карта", "Крипто", "Электронный кошелёк", "Наличные"];
const rooms = ["Отдельная комната", "Делю с другими", "Без разницы"];
const equipmentOptions = ["ПК/ноутбук", "Камера", "Свет", "Реквизит/костюмы", "Стабильный интернет"];
const studioSchedule = ["Фиксированные смены", "Свободный график", "Гибрид"];
const security = ["Охрана на территории", "Тревожная кнопка", "Анонимность"];
const amenities = ["Зона отдыха/кухня", "Душ", "Парковка", "Гримёрная/визажист", "Шкафчик", "Медпомощь"];
const teamOptions = ["Только девушки", "Только парни", "Смешанный", "Без разницы"];
const adminOptions = ["Только женщины", "Только мужчины", "Смешанный", "Без разницы"];
const managerOptions = ["Женщина", "Мужчина", "Без разницы"];
const quickWishes = ["Без испытательного срока", "Можно совмещать с учёбой", "Студия рядом с метро", "Гибкий старт смены", "Помощь с продвижением профиля"];

const modelRequirementFields = [
  "minimumPercent", "payFormat", "payoutFrequency", "payMethod", "bonus", "penalty",
  "room", "equipmentRequirements", "studioSchedule", "security", "location", "amenities",
  "modelsTeam", "adminsGender", "managerGender"
];

const specialistRequirementFields = [
  "specSalary", "specPayFormat", "specPayFrequency", "specProbation",
  "specWorkFormat", "specEquipment", "specLocation", "specBenefits",
  "specManagerGender", "specTeamGender", "specTeamSize"
];

function experienceMonthsFromLabel(label: string) {
  if (label.includes("3-6")) return 4;
  if (label.includes("6-12")) return 9;
  if (label.includes("1-3")) return 24;
  if (label.includes("Более 3")) return 48;
  if (label.includes("От 6 месяцев")) return 6;
  if (label.includes("От 1 года")) return 12;
  if (label.includes("От 3 лет")) return 36;
  return 2;
}

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
              if (multi) onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
              else onChange(value.includes(option) ? [] : [option]);
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

function ImportanceButtons({ field, values, onChange }: { field: string; values: Record<string, Importance>; onChange: (field: string, value: Importance) => void }) {
  return (
    <div className="mt-3 flex gap-1.5">
      {[
        ["must", "Обязательно"],
        ["nice", "Желательно"],
        ["none", "Не важно"]
      ].map(([level, label]) => (
        <button key={level} type="button" className={importanceClass((values[field] || "none") === level, level as Importance)} onClick={() => onChange(field, level as Importance)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ReqCard({
  label,
  field,
  children,
  importance,
  setImportance
}: {
  label: string;
  field: string;
  children: React.ReactNode;
  importance: Record<string, Importance>;
  setImportance: (field: string, value: Importance) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E4E1] p-3">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
      <ImportanceButtons field={field} values={importance} onChange={setImportance} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#E4E4E1] py-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="max-w-[58%] text-right font-semibold text-ink">{String(value || "—")}</span>
    </div>
  );
}

function ImportanceBadge({ level }: { level: Importance }) {
  const label = level === "must" ? "обязательно" : level === "nice" ? "желательно" : "не важно";
  const className =
    level === "must"
      ? "border-red-200 bg-red-50 text-red-800"
      : level === "nice"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-100 text-zinc-700";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${className}`}>{label}</span>;
}

function RequirementSummaryRow({ label, value, level }: { label: string; value: string | number; level: Importance }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#E4E4E1] py-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="flex max-w-[62%] flex-wrap items-center justify-end gap-1.5 text-right font-semibold text-ink">
        <span>{String(value || "—")}</span>
        <ImportanceBadge level={level} />
      </span>
    </div>
  );
}

export function ModelResumeForm({ action, resume }: ModelResumeFormProps) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("model");

  /* ── Model state ── */
  const [categoryValue, setCategoryValue] = useState<string[]>([]);
  const [experienceValue, setExperienceValue] = useState<string[]>(["До 3 мес"]);
  const [statusValue, setStatusValue] = useState<string[]>(["Рассматриваю предложения"]);
  const [formatValue, setFormatValue] = useState<string[]>(["Любой вариант"]);
  const [shifts, setShifts] = useState(4);
  const [hours, setHours] = useState(6);
  const [incomeValue, setIncomeValue] = useState<string[]>([]);
  const [sitesValue, setSitesValue] = useState<string[]>([]);
  const [languagesValue, setLanguagesValue] = useState<string[]>(["Русский"]);
  const [percent, setPercent] = useState(50);
  const [payFormatValue, setPayFormatValue] = useState<string[]>(["% от токенов"]);
  const [payFrequencyValue, setPayFrequencyValue] = useState<string[]>(["Раз в неделю"]);
  const [payMethodValue, setPayMethodValue] = useState<string[]>([]);
  const [bonus, setBonus] = useState<string[]>(["Без разницы"]);
  const [penalty, setPenalty] = useState<string[]>(["По согласованию"]);
  const [roomValue, setRoomValue] = useState<string[]>(["Без разницы"]);
  const [equipmentValue, setEquipmentValue] = useState<string[]>([]);
  const [scheduleValue, setScheduleValue] = useState<string[]>(["Гибрид"]);
  const [securityValue, setSecurityValue] = useState<string[]>([]);
  const [location, setLocation] = useState(resume?.city || "");
  const [amenitiesValue, setAmenitiesValue] = useState<string[]>([]);
  const [modelsTeam, setModelsTeam] = useState<string[]>(["Без разницы"]);
  const [adminsGender, setAdminsGender] = useState<string[]>(["Без разницы"]);
  const [managerGender, setManagerGender] = useState<string[]>(["Без разницы"]);

  /* ── Specialist state ── */
  const [specPosition, setSpecPosition] = useState<string[]>([]);
  const [specExperience, setSpecExperience] = useState<string[]>(["Без опыта"]);
  const [specStatus, setSpecStatus] = useState<string[]>(["Рассматриваю предложения"]);
  const [specEmployment, setSpecEmployment] = useState<string[]>([]);
  const [specSchedule, setSpecSchedule] = useState<string[]>([]);
  const [specIncome, setSpecIncome] = useState<string[]>([]);
  const [specSkills, setSpecSkills] = useState<string[]>([]);
  const [specEducation, setSpecEducation] = useState<string[]>([]);
  const [specLanguages, setSpecLanguages] = useState<string[]>(["Русский"]);
  const [specSalary, setSpecSalary] = useState("");
  const [specPayFormat, setSpecPayFormat] = useState<string[]>([]);
  const [specPayFrequency, setSpecPayFrequency] = useState<string[]>([]);
  const [specProbation, setSpecProbation] = useState<string[]>(["Без разницы"]);
  const [specWorkFormat, setSpecWorkFormat] = useState<string[]>(["Без разницы"]);
  const [specEquipment, setSpecEquipment] = useState<string[]>(["Без разницы"]);
  const [specLocationValue, setSpecLocationValue] = useState(resume?.city || "");
  const [specBenefits, setSpecBenefits] = useState<string[]>([]);
  const [specMgrGender, setSpecMgrGender] = useState<string[]>(["Без разницы"]);
  const [specTeamGender, setSpecTeamGender] = useState<string[]>(["Без разницы"]);
  const [specTeamSize, setSpecTeamSize] = useState<string[]>(["Без разницы"]);

  /* ── Shared state ── */
  const [wishes, setWishes] = useState<string[]>([]);
  const [wishesText, setWishesText] = useState("");
  const [contact, setContact] = useState(resume?.contactTelegram || "");
  const [email, setEmail] = useState(resume?.contactEmail || "");
  const [importance, setImportanceState] = useState<Record<string, Importance>>({});
  const quizRef = useRef<HTMLElement | null>(null);

  const lastStep = step === steps.length - 1;
  const progress = Math.round((step / (steps.length - 1)) * 100);

  const currentLocation = role === "model" ? location : specLocationValue;
  const title = resume?.title || (role === "model" ? `Резюме модели${currentLocation ? `, ${currentLocation}` : ""}` : `Резюме специалиста${currentLocation ? `, ${currentLocation}` : ""}`);

  const expMonths = role === "model"
    ? experienceMonthsFromLabel(experienceValue[0] || "")
    : experienceMonthsFromLabel(specExperience[0] || "");

  const requirementFieldsForRole = role === "model" ? modelRequirementFields : specialistRequirementFields;

  const fill = useMemo(() => {
    if (role === "model") {
      const groups = [categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, languagesValue, payFormatValue, payFrequencyValue, payMethodValue, roomValue, equipmentValue, scheduleValue, securityValue, amenitiesValue, modelsTeam, adminsGender, managerGender];
      return Math.round((groups.filter((g) => g.length > 0).length / groups.length) * 100);
    }
    const groups = [specPosition, specExperience, specStatus, specEmployment, specSchedule, specIncome, specSkills, specEducation, specLanguages, specPayFormat, specPayFrequency, specProbation, specWorkFormat, specEquipment, specBenefits, specMgrGender, specTeamGender, specTeamSize];
    return Math.round((groups.filter((g) => g.length > 0).length / groups.length) * 100);
  }, [role, categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, languagesValue, payFormatValue, payFrequencyValue, payMethodValue, roomValue, equipmentValue, scheduleValue, securityValue, amenitiesValue, modelsTeam, adminsGender, managerGender, specPosition, specExperience, specStatus, specEmployment, specSchedule, specIncome, specSkills, specEducation, specLanguages, specPayFormat, specPayFrequency, specProbation, specWorkFormat, specEquipment, specBenefits, specMgrGender, specTeamGender, specTeamSize]);

  function setImportance(field: string, value: Importance) {
    setImportanceState((current) => ({ ...current, [field]: value }));
  }

  function goToStep(nextStep: number) {
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  const rolePill = role === "model"
    ? <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Резюме модели</span>
    : <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Резюме специалиста</span>;

  return (
    <section ref={quizRef} className="quiz-shell border-[#E4E4E1] bg-white" data-quiz-root>
      <div className="quiz-header bg-white">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Шаг {step + 1} из {steps.length}</div>
          {step > 0 && rolePill}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E4E1]">
          <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form action={action} className="quiz-body bg-white">
        {/* Hidden inputs — conditional on role */}
        <input type="hidden" name="resumeTemplate" value={role === "model" ? "model-quiz-v2" : "specialist-quiz-v1"} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="roleGoal" value={role === "model" ? "Модель" : join(specPosition) || "Специалист"} />
        <input type="hidden" name="city" value={currentLocation} />
        <input type="hidden" name="experienceMonths" value={expMonths} />
        <input type="hidden" name="contactTelegram" value={contact} />
        <input type="hidden" name="contactEmail" value={email} />
        <input type="hidden" name="resumeConfirm" value="on" />

        {role === "model" && (
          <>
            <input type="hidden" name="minimumPercent" value={`${percent}%`} />
            <input type="hidden" name="shiftsPerWeek" value={`${shifts} смены`} />
            <input type="hidden" name="shiftLength" value={`${hours} часов`} />
            <input type="hidden" name="about" value={join([join(categoryValue), join(statusValue), join(formatValue)]) || "Резюме модели"} />
            <input type="hidden" name="bio" value={join([join(categoryValue), join(statusValue), join(formatValue)]) || "Резюме модели"} />
            {modelRequirementFields.map((field) => <input key={field} type="hidden" name={`${field}Importance`} value={importance[field] || "none"} />)}
            <HiddenList name="categories" values={categoryValue} />
            <HiddenList name="modelExperience" values={experienceValue} />
            <HiddenList name="modelSearchStatus" values={statusValue} />
            <HiddenList name="workFormatModel" values={formatValue} />
            <HiddenList name="incomePerShift" values={incomeValue} />
            <HiddenList name="sites" values={sitesValue} />
            <HiddenList name="languages" values={languagesValue} />
            <HiddenList name="payFormat" values={payFormatValue} />
            <HiddenList name="payoutFrequency" values={payFrequencyValue} />
            <HiddenList name="payMethod" values={payMethodValue} />
            <HiddenList name="bonus" values={bonus} />
            <HiddenList name="penalty" values={penalty} />
            <HiddenList name="roomRequirements" values={roomValue} />
            <HiddenList name="equipmentRequirements" values={equipmentValue} />
            <HiddenList name="studioSchedule" values={scheduleValue} />
            <HiddenList name="security" values={securityValue} />
            <HiddenList name="amenities" values={amenitiesValue} />
            <HiddenList name="modelsTeam" values={modelsTeam} />
            <HiddenList name="adminsGender" values={adminsGender} />
            <HiddenList name="managerGender" values={managerGender} />
          </>
        )}

        {role === "specialist" && (
          <>
            <input type="hidden" name="specSalaryValue" value={specSalary} />
            <input type="hidden" name="about" value={join([join(specPosition), join(specStatus), join(specEmployment)]) || "Резюме специалиста"} />
            <input type="hidden" name="bio" value={join([join(specPosition), join(specStatus), join(specEmployment)]) || "Резюме специалиста"} />
            {specialistRequirementFields.map((field) => <input key={field} type="hidden" name={`${field}Importance`} value={importance[field] || "none"} />)}
            <HiddenList name="specPosition" values={specPosition} />
            <HiddenList name="specExperience" values={specExperience} />
            <HiddenList name="specSearchStatus" values={specStatus} />
            <HiddenList name="specEmployment" values={specEmployment} />
            <HiddenList name="specSchedule" values={specSchedule} />
            <HiddenList name="specIncome" values={specIncome} />
            <HiddenList name="specSkills" values={specSkills} />
            <HiddenList name="specEducation" values={specEducation} />
            <HiddenList name="specLanguages" values={specLanguages} />
            <HiddenList name="specPayFormat" values={specPayFormat} />
            <HiddenList name="specPayFrequency" values={specPayFrequency} />
            <HiddenList name="specProbation" values={specProbation} />
            <HiddenList name="specWorkFormat" values={specWorkFormat} />
            <HiddenList name="specEquipment" values={specEquipment} />
            <HiddenList name="specBenefits" values={specBenefits} />
            <HiddenList name="specManagerGender" values={specMgrGender} />
            <HiddenList name="specTeamGender" values={specTeamGender} />
            <HiddenList name="specTeamSize" values={specTeamSize} />
            <input type="hidden" name="specLocationValue" value={specLocationValue} />
          </>
        )}
        <HiddenList name="quickWishes" values={wishes} />
        <input type="hidden" name="wishesText" value={wishesText} />

        {/* ── Step 0: Role selection ── */}
        <div className={step === 0 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-2xl font-bold leading-tight text-ink">Создать резюме</h2>
          <p className="text-sm leading-6 text-zinc-500">Выберите тип резюме. Чем подробнее анкета, тем точнее отклики.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-2xl border-2 p-5 text-left transition ${role === "model" ? "border-hot bg-red-50" : "border-[#E4E4E1] bg-white hover:border-hot/40"}`}
              onClick={() => setRole("model")}
            >
              <span className="text-3xl">👩‍💻</span>
              <span className="mt-2 block text-lg font-bold text-ink">Модель</span>
              <span className="mt-1 block text-sm text-zinc-500">Ищу студию для работы вебкам-моделью</span>
            </button>
            <button
              type="button"
              className={`rounded-2xl border-2 p-5 text-left transition ${role === "specialist" ? "border-blue-500 bg-blue-50" : "border-[#E4E4E1] bg-white hover:border-blue-400/40"}`}
              onClick={() => setRole("specialist")}
            >
              <span className="text-3xl">🛠️</span>
              <span className="mt-2 block text-lg font-bold text-ink">Специалист</span>
              <span className="mt-1 block text-sm text-zinc-500">Администратор, оператор, SMM и другие роли</span>
            </button>
          </div>
          <div className="rounded-2xl border border-[#E4E4E1] p-4">
            <span className="block text-sm font-semibold text-ink">Это займет около 5 минут</span>
            <p className="mt-1 text-sm leading-5 text-zinc-500">После публикации резюме можно редактировать в личном кабинете.</p>
          </div>
        </div>

        {/* ── Step 1: About ── */}
        <div className={step === 1 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О себе</h2>
          {role === "model" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Категория работы</span>
                <ChipGroup options={categories} value={categoryValue} onChange={setCategoryValue} multi otherPlaceholder="Уточните категорию" />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Опыт работы</span>
                <ChipGroup options={experience} value={experienceValue} onChange={setExperienceValue} />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Сейчас вы</span>
                <ChipGroup options={status} value={statusValue} onChange={setStatusValue} />
              </div>
            </>
          )}
          {role === "specialist" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Желаемая должность</span>
                <ChipGroup options={specialistPositions} value={specPosition} onChange={setSpecPosition} multi otherPlaceholder="Уточните должность" />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Опыт работы</span>
                <ChipGroup options={specialistExperience} value={specExperience} onChange={setSpecExperience} />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Сейчас вы</span>
                <ChipGroup options={status} value={specStatus} onChange={setSpecStatus} />
              </div>
            </>
          )}
        </div>

        {/* ── Step 2: Format / workload ── */}
        <div className={step === 2 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">{role === "model" ? "Формат и нагрузка" : "Занятость и график"}</h2>
          {role === "model" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Формат работы</span>
                <ChipGroup options={formats} value={formatValue} onChange={setFormatValue} />
              </div>
              <div>
                <span className="block text-sm font-semibold">Смен в неделю</span>
                <div className="text-2xl font-bold text-hot">{shifts} смены</div>
                <input className="w-full accent-hot" type="range" min="1" max="7" value={shifts} onChange={(e) => setShifts(Number(e.target.value))} />
              </div>
              <div>
                <span className="block text-sm font-semibold">Длительность смены</span>
                <div className="text-2xl font-bold text-hot">{hours} часов</div>
                <input className="w-full accent-hot" type="range" min="2" max="12" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Средний доход за смену сейчас</span>
                <ChipGroup options={incomes} value={incomeValue} onChange={setIncomeValue} />
              </div>
            </>
          )}
          {role === "specialist" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Тип занятости</span>
                <ChipGroup options={specialistEmployment} value={specEmployment} onChange={setSpecEmployment} multi />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Желаемый график</span>
                <ChipGroup options={specialistSchedule} value={specSchedule} onChange={setSpecSchedule} />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Ожидаемый доход</span>
                <ChipGroup options={specialistIncome} value={specIncome} onChange={setSpecIncome} />
              </div>
            </>
          )}
        </div>

        {/* ── Step 3: Platforms/Skills ── */}
        <div className={step === 3 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">{role === "model" ? "Площадки и языки" : "Навыки и образование"}</h2>
          {role === "model" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Доступные сайты</span>
                <ChipGroup options={sites} value={sitesValue} onChange={setSitesValue} multi otherPlaceholder="Уточните сайт" />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Языки общения</span>
                <ChipGroup options={languages} value={languagesValue} onChange={setLanguagesValue} multi otherPlaceholder="Уточните язык" />
              </div>
            </>
          )}
          {role === "specialist" && (
            <>
              <div>
                <span className="mb-2 block text-sm font-semibold">Навыки</span>
                <ChipGroup options={specialistSkills} value={specSkills} onChange={setSpecSkills} multi otherPlaceholder="Уточните навык" />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Образование</span>
                <ChipGroup options={specialistEducation} value={specEducation} onChange={setSpecEducation} />
              </div>
              <div>
                <span className="mb-2 block text-sm font-semibold">Языки общения</span>
                <ChipGroup options={languages} value={specLanguages} onChange={setSpecLanguages} multi otherPlaceholder="Уточните язык" />
              </div>
            </>
          )}
        </div>

        {/* ── Step 4: Financial requirements ── */}
        <div className={step === 4 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Финансовые требования</h2>
          {role === "model" && (
            <>
              <ReqCard label="Минимальный процент от заработка" field="minimumPercent" importance={importance} setImportance={setImportance}>
                <div className="text-2xl font-bold text-hot">{percent}%</div>
                <input className="w-full accent-hot" type="range" min="0" max="100" value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
              </ReqCard>
              <ReqCard label="Формат расчета" field="payFormat" importance={importance} setImportance={setImportance}>
                <ChipGroup options={payFormats} value={payFormatValue} onChange={setPayFormatValue} />
              </ReqCard>
              <ReqCard label="Периодичность выплат" field="payoutFrequency" importance={importance} setImportance={setImportance}>
                <ChipGroup options={payFrequency} value={payFrequencyValue} onChange={setPayFrequencyValue} />
              </ReqCard>
              <ReqCard label="Способ выплаты" field="payMethod" importance={importance} setImportance={setImportance}>
                <ChipGroup options={payMethod} value={payMethodValue} onChange={setPayMethodValue} multi />
              </ReqCard>
              <ReqCard label="Бонусная система" field="bonus" importance={importance} setImportance={setImportance}>
                <ChipGroup options={["Да, нужна", "Без разницы"]} value={bonus} onChange={setBonus} />
              </ReqCard>
              <ReqCard label="Штрафы и удержания" field="penalty" importance={importance} setImportance={setImportance}>
                <ChipGroup options={["Недопустимы", "По согласованию", "Без разницы"]} value={penalty} onChange={setPenalty} />
              </ReqCard>
            </>
          )}
          {role === "specialist" && (
            <>
              <ReqCard label="Минимальная зарплата" field="specSalary" importance={importance} setImportance={setImportance}>
                <input
                  className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot"
                  value={specSalary}
                  onChange={(e) => setSpecSalary(e.target.value)}
                  placeholder="Например, $500"
                />
              </ReqCard>
              <ReqCard label="Формат оплаты" field="specPayFormat" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistPayFormats} value={specPayFormat} onChange={setSpecPayFormat} />
              </ReqCard>
              <ReqCard label="Периодичность выплат" field="specPayFrequency" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistPayFrequency} value={specPayFrequency} onChange={setSpecPayFrequency} />
              </ReqCard>
              <ReqCard label="Испытательный срок" field="specProbation" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistProbation} value={specProbation} onChange={setSpecProbation} />
              </ReqCard>
            </>
          )}
        </div>

        {/* ── Step 5: Conditions ── */}
        <div className={step === 5 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Условия{role === "model" ? " и комфорт" : " работы"}</h2>
          {role === "model" && (
            <>
              <ReqCard label="Тип комнаты" field="room" importance={importance} setImportance={setImportance}>
                <ChipGroup options={rooms} value={roomValue} onChange={setRoomValue} />
              </ReqCard>
              <ReqCard label="Оборудование предоставляется" field="equipmentRequirements" importance={importance} setImportance={setImportance}>
                <ChipGroup options={equipmentOptions} value={equipmentValue} onChange={setEquipmentValue} multi />
              </ReqCard>
              <ReqCard label="График работы" field="studioSchedule" importance={importance} setImportance={setImportance}>
                <ChipGroup options={studioSchedule} value={scheduleValue} onChange={setScheduleValue} />
              </ReqCard>
              <ReqCard label="Безопасность" field="security" importance={importance} setImportance={setImportance}>
                <ChipGroup options={security} value={securityValue} onChange={setSecurityValue} multi />
              </ReqCard>
              <ReqCard label="Локация" field="location" importance={importance} setImportance={setImportance}>
                <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Город / район" />
              </ReqCard>
              <ReqCard label="Удобства" field="amenities" importance={importance} setImportance={setImportance}>
                <ChipGroup options={amenities} value={amenitiesValue} onChange={setAmenitiesValue} multi />
              </ReqCard>
            </>
          )}
          {role === "specialist" && (
            <>
              <ReqCard label="Формат работы" field="specWorkFormat" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistWorkFormat} value={specWorkFormat} onChange={setSpecWorkFormat} />
              </ReqCard>
              <ReqCard label="Оборудование от работодателя" field="specEquipment" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistEquipmentNeeded} value={specEquipment} onChange={setSpecEquipment} />
              </ReqCard>
              <ReqCard label="Локация" field="specLocation" importance={importance} setImportance={setImportance}>
                <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specLocationValue} onChange={(e) => setSpecLocationValue(e.target.value)} placeholder="Город / район" />
              </ReqCard>
              <ReqCard label="Доп. условия" field="specBenefits" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistBenefits} value={specBenefits} onChange={setSpecBenefits} multi />
              </ReqCard>
            </>
          )}
        </div>

        {/* ── Step 6: Team ── */}
        <div className={step === 6 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Состав коллектива</h2>
          {role === "model" && (
            <>
              <ReqCard label="Состав моделей на студии" field="modelsTeam" importance={importance} setImportance={setImportance}>
                <ChipGroup options={teamOptions} value={modelsTeam} onChange={setModelsTeam} />
              </ReqCard>
              <ReqCard label="Пол администраторов/коучей/тренеров" field="adminsGender" importance={importance} setImportance={setImportance}>
                <ChipGroup options={adminOptions} value={adminsGender} onChange={setAdminsGender} />
              </ReqCard>
              <ReqCard label="Пол управляющего/директора" field="managerGender" importance={importance} setImportance={setImportance}>
                <ChipGroup options={managerOptions} value={managerGender} onChange={setManagerGender} />
              </ReqCard>
            </>
          )}
          {role === "specialist" && (
            <>
              <ReqCard label="Пол руководителя" field="specManagerGender" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistManagerGender} value={specMgrGender} onChange={setSpecMgrGender} />
              </ReqCard>
              <ReqCard label="Состав команды" field="specTeamGender" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistTeamGender} value={specTeamGender} onChange={setSpecTeamGender} />
              </ReqCard>
              <ReqCard label="Размер команды" field="specTeamSize" importance={importance} setImportance={setImportance}>
                <ChipGroup options={specialistTeamSize} value={specTeamSize} onChange={setSpecTeamSize} />
              </ReqCard>
            </>
          )}
        </div>

        {/* ── Step 7: Additional wishes (shared) ── */}
        <div className={step === 7 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Дополнительные пожелания</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Быстрый выбор</span>
            <ChipGroup options={quickWishes} value={wishes} onChange={setWishes} multi />
          </div>
          <textarea className="min-h-28 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={wishesText} onChange={(e) => setWishesText(e.target.value)} placeholder="Напишите, если есть что-то еще важное..." />
        </div>

        {/* ── Step 8: Contacts (shared) ── */}
        <div className={step === 8 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Контакты</h2>
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram / телефон" />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email, необязательно" />
          <p className="text-xs leading-5 text-zinc-500">Контакт видят авторизованные пользователи.</p>
        </div>

        {/* ── Step 9: Summary ── */}
        <div className={step === 9 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Резюме готово</h2>
          <div className="h-2 overflow-hidden rounded-full bg-[#E4E4E1]">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fill}%` }} />
          </div>
          <p className="text-xs text-zinc-500">Заполнено на {fill}%</p>

          {role === "model" && (
            <>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О себе</p>
                <SummaryRow label="Категории" value={join(categoryValue)} />
                <SummaryRow label="Опыт" value={join(experienceValue)} />
                <SummaryRow label="Формат" value={join(formatValue)} />
                <SummaryRow label="Смены" value={`${shifts} в неделю по ${hours} часов`} />
                <SummaryRow label="Сайты" value={join(sitesValue)} />
                <SummaryRow label="Языки" value={join(languagesValue)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Требования</p>
                <RequirementSummaryRow label="Минимальный процент" value={`${percent}%`} level={importance.minimumPercent || "none"} />
                <RequirementSummaryRow label="Формат расчета" value={join(payFormatValue)} level={importance.payFormat || "none"} />
                <RequirementSummaryRow label="Частота выплат" value={join(payFrequencyValue)} level={importance.payoutFrequency || "none"} />
                <RequirementSummaryRow label="Способ выплаты" value={join(payMethodValue)} level={importance.payMethod || "none"} />
                <RequirementSummaryRow label="Комната" value={join(roomValue)} level={importance.room || "none"} />
                <RequirementSummaryRow label="Оборудование" value={join(equipmentValue)} level={importance.equipmentRequirements || "none"} />
                <RequirementSummaryRow label="График студии" value={join(scheduleValue)} level={importance.studioSchedule || "none"} />
                <RequirementSummaryRow label="Безопасность" value={join(securityValue)} level={importance.security || "none"} />
                <RequirementSummaryRow label="Локация" value={location} level={importance.location || "none"} />
                <RequirementSummaryRow label="Удобства" value={join(amenitiesValue)} level={importance.amenities || "none"} />
              </div>
            </>
          )}

          {role === "specialist" && (
            <>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О себе</p>
                <SummaryRow label="Должность" value={join(specPosition)} />
                <SummaryRow label="Опыт" value={join(specExperience)} />
                <SummaryRow label="Статус" value={join(specStatus)} />
                <SummaryRow label="Занятость" value={join(specEmployment)} />
                <SummaryRow label="График" value={join(specSchedule)} />
                <SummaryRow label="Доход" value={join(specIncome)} />
                <SummaryRow label="Навыки" value={join(specSkills)} />
                <SummaryRow label="Образование" value={join(specEducation)} />
                <SummaryRow label="Языки" value={join(specLanguages)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Финансы</p>
                <RequirementSummaryRow label="Мин. зарплата" value={specSalary} level={importance.specSalary || "none"} />
                <RequirementSummaryRow label="Формат оплаты" value={join(specPayFormat)} level={importance.specPayFormat || "none"} />
                <RequirementSummaryRow label="Периодичность" value={join(specPayFrequency)} level={importance.specPayFrequency || "none"} />
                <RequirementSummaryRow label="Испыт. срок" value={join(specProbation)} level={importance.specProbation || "none"} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Условия</p>
                <RequirementSummaryRow label="Формат работы" value={join(specWorkFormat)} level={importance.specWorkFormat || "none"} />
                <RequirementSummaryRow label="Оборудование" value={join(specEquipment)} level={importance.specEquipment || "none"} />
                <RequirementSummaryRow label="Локация" value={specLocationValue} level={importance.specLocation || "none"} />
                <RequirementSummaryRow label="Доп. условия" value={join(specBenefits)} level={importance.specBenefits || "none"} />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Команда</p>
                <RequirementSummaryRow label="Пол руководителя" value={join(specMgrGender)} level={importance.specManagerGender || "none"} />
                <RequirementSummaryRow label="Состав команды" value={join(specTeamGender)} level={importance.specTeamGender || "none"} />
                <RequirementSummaryRow label="Размер команды" value={join(specTeamSize)} level={importance.specTeamSize || "none"} />
              </div>
            </>
          )}
        </div>

        <div className="quiz-footer">
          <button className="quiz-back" type="button" disabled={step === 0} onClick={() => goToStep(step - 1)}>
            Назад
          </button>
          {!lastStep ? (
            <button className="quiz-next bg-hot" type="button" onClick={() => goToStep(step + 1)}>
              {step === 0 ? "Начать" : step === steps.length - 2 ? "Посмотреть резюме" : "Далее"}
            </button>
          ) : (
            <FormSubmitButton className="quiz-next bg-hot" pendingText="Сохраняем...">
              Опубликовать резюме
            </FormSubmitButton>
          )}
        </div>
      </form>
    </section>
  );
}
