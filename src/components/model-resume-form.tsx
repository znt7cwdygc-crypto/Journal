"use client";

import { useMemo, useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  modelResumeSteps,
  modelResumeOptions,
  specialistResumeSteps,
  specialistResumeOptions,
  importance as importanceOptions
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

function experienceMonthsFromLabel(label: string) {
  if (label.includes("3-6")) return 4;
  if (label.includes("6-12")) return 9;
  if (label.includes("1-3")) return 24;
  if (label.includes("Более 3")) return 48;
  if (label.includes("От 6")) return 6;
  if (label.includes("От 1")) return 12;
  if (label.includes("От 3")) return 36;
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
      {importanceOptions.map(({ value: level, label }) => (
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
  const [gender, setGender] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [formatValue, setFormatValue] = useState<string[]>(["Любой вариант"]);
  const [city, setCity] = useState(resume?.city || "");
  const [citizenship, setCitizenship] = useState<string[]>([]);
  const [categoryValue, setCategoryValue] = useState<string[]>([]);
  const [experienceValue, setExperienceValue] = useState<string[]>(["Без опыта"]);
  const [statusValue, setStatusValue] = useState<string[]>(["Рассматриваю предложения"]);
  const [sitesValue, setSitesValue] = useState<string[]>([]);
  const [appearanceValue, setAppearanceValue] = useState<string[]>([]);
  const [shifts, setShifts] = useState(4);
  const [hours, setHours] = useState(6);
  const [incomeValue, setIncomeValue] = useState<string[]>([]);
  const [percent, setPercent] = useState(50);
  const [payoutFrequencyValue, setPayoutFrequencyValue] = useState<string[]>(["Раз в неделю"]);
  const [payMethodValue, setPayMethodValue] = useState<string[]>([]);
  const [penaltyValue, setPenaltyValue] = useState<string[]>([]);
  const [roomsText, setRoomsText] = useState("");
  const [equipmentValue, setEquipmentValue] = useState<string[]>([]);
  const [shiftTimeValue, setShiftTimeValue] = useState<string[]>([]);
  const [amenitiesValue, setAmenitiesValue] = useState<string[]>([]);
  const [teamComfort, setTeamComfort] = useState<string[]>(["Без разницы"]);
  const [adminGender, setAdminGender] = useState<string[]>(["Без разницы"]);
  const [wishesText, setWishesText] = useState("");
  const [contact, setContact] = useState(resume?.contactTelegram || "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(resume?.contactEmail || "");

  /* ── Specialist state ── */
  const [specPosition, setSpecPosition] = useState<string[]>([]);
  const [specPositionOther, setSpecPositionOther] = useState("");
  const [specExperience, setSpecExperience] = useState<string[]>(["Без опыта"]);
  const [specStatus, setSpecStatus] = useState<string[]>(["Рассматриваю предложения"]);
  const [specWorkFormat, setSpecWorkFormat] = useState<string[]>(["Любой вариант"]);
  const [specCity, setSpecCity] = useState(resume?.city || "");
  const [specRelocation, setSpecRelocation] = useState<string[]>([]);
  const [specEmployment, setSpecEmployment] = useState<string[]>([]);
  const [specDuties, setSpecDuties] = useState("");
  const [specShiftSchemes, setSpecShiftSchemes] = useState<string[]>([]);
  const [specShiftLength, setSpecShiftLength] = useState<string[]>([]);
  const [specPriorityShifts, setSpecPriorityShifts] = useState<string[]>([]);
  const [specWeekends, setSpecWeekends] = useState<string[]>([]);
  const [specPayFormat, setSpecPayFormat] = useState<string[]>([]);
  const [specSalary, setSpecSalary] = useState("");
  const [specPayFrequency, setSpecPayFrequency] = useState<string[]>([]);
  const [specPayMethod, setSpecPayMethod] = useState<string[]>([]);
  const [specTraining, setSpecTraining] = useState<string[]>([]);
  const [specImportant, setSpecImportant] = useState<string[]>([]);
  const [specCareerGrowth, setSpecCareerGrowth] = useState<string[]>([]);
  const [specPenalties, setSpecPenalties] = useState<string[]>([]);
  const [specAdditionalWishes, setSpecAdditionalWishes] = useState("");
  const [specLanguages, setSpecLanguages] = useState<string[]>(["Русский"]);
  const [specKeySkills, setSpecKeySkills] = useState("");
  const [specPrograms, setSpecPrograms] = useState<string[]>([]);
  const [specPortfolio, setSpecPortfolio] = useState("");
  const [specAboutMe, setSpecAboutMe] = useState("");
  const [specSocialLinks, setSpecSocialLinks] = useState("");
  const [specContactPerson, setSpecContactPerson] = useState("");
  const [specContactComm, setSpecContactComm] = useState("");
  const [specResumeLink, setSpecResumeLink] = useState("");

  /* ── Shared state ── */
  const [importance, setImportanceState] = useState<Record<string, Importance>>({});
  const quizRef = useRef<HTMLElement | null>(null);

  const steps = role === "model" ? modelResumeSteps : specialistResumeSteps;
  const lastStep = step === steps.length - 1;
  const progress = Math.round((step / (steps.length - 1)) * 100);

  const currentLocation = role === "model" ? city : specCity;
  const title = resume?.title || (role === "model" ? `Резюме модели${currentLocation ? `, ${currentLocation}` : ""}` : `Резюме специалиста${currentLocation ? `, ${currentLocation}` : ""}`);

  const expMonths = role === "model"
    ? experienceMonthsFromLabel(experienceValue[0] || "")
    : experienceMonthsFromLabel(specExperience[0] || "");

  const fill = useMemo(() => {
    if (role === "model") {
      const groups = [gender, categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, payoutFrequencyValue, payMethodValue, penaltyValue, equipmentValue, amenitiesValue, teamComfort, adminGender];
      return Math.round((groups.filter((g) => g.length > 0).length / groups.length) * 100);
    }
    const groups = [specPosition, specExperience, specStatus, specWorkFormat, specEmployment, specShiftSchemes, specShiftLength, specPayFormat, specPayFrequency, specPayMethod, specLanguages, specTraining, specImportant, specCareerGrowth, specPenalties];
    return Math.round((groups.filter((g) => g.length > 0).length / groups.length) * 100);
  }, [role, gender, categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, payoutFrequencyValue, payMethodValue, penaltyValue, equipmentValue, amenitiesValue, teamComfort, adminGender, specPosition, specExperience, specStatus, specWorkFormat, specEmployment, specShiftSchemes, specShiftLength, specPayFormat, specPayFrequency, specPayMethod, specLanguages, specTraining, specImportant, specCareerGrowth, specPenalties]);

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
        {/* Hidden inputs */}
        <input type="hidden" name="resumeTemplate" value={role === "model" ? "model-quiz-v3" : "specialist-quiz-v2"} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="roleGoal" value={role === "model" ? "Модель" : join(specPosition) || "Специалист"} />
        <input type="hidden" name="city" value={currentLocation} />
        <input type="hidden" name="experienceMonths" value={expMonths} />
        <input type="hidden" name="contactTelegram" value={contact} />
        <input type="hidden" name="contactPhone" value={phone} />
        <input type="hidden" name="contactEmail" value={email} />
        <input type="hidden" name="resumeConfirm" value="on" />

        {role === "model" && (
          <>
            <HiddenList name="gender" values={gender} />
            <input type="hidden" name="age" value={age} />
            <HiddenList name="workFormatModel" values={formatValue} />
            <HiddenList name="citizenship" values={citizenship} />
            <HiddenList name="categories" values={categoryValue} />
            <HiddenList name="modelExperience" values={experienceValue} />
            <HiddenList name="modelSearchStatus" values={statusValue} />
            <HiddenList name="sites" values={sitesValue} />
            <HiddenList name="appearance" values={appearanceValue} />
            <input type="hidden" name="shiftsPerWeek" value={`${shifts}`} />
            <input type="hidden" name="shiftLength" value={`${hours}`} />
            <HiddenList name="incomePerShift" values={incomeValue} />
            <input type="hidden" name="minimumPercent" value={`${percent}%`} />
            <input type="hidden" name="minimumPercentImportance" value={importance.minimumPercent || "none"} />
            <HiddenList name="payoutFrequency" values={payoutFrequencyValue} />
            <HiddenList name="payMethod" values={payMethodValue} />
            <HiddenList name="penalties" values={penaltyValue} />
            <input type="hidden" name="rooms" value={roomsText} />
            <HiddenList name="equipment" values={equipmentValue} />
            <HiddenList name="shiftTimePriority" values={shiftTimeValue} />
            <HiddenList name="amenities" values={amenitiesValue} />
            <HiddenList name="teamComfort" values={teamComfort} />
            <HiddenList name="adminGender" values={adminGender} />
            <input type="hidden" name="wishesText" value={wishesText} />
            <input type="hidden" name="about" value={join([join(gender), age ? `${age} лет` : "", join(categoryValue), join(statusValue)]) || "Резюме модели"} />
            <input type="hidden" name="bio" value={join([join(gender), age ? `${age} лет` : "", join(categoryValue), join(statusValue)]) || "Резюме модели"} />
          </>
        )}

        {role === "specialist" && (
          <>
            <HiddenList name="specPosition" values={specPosition} />
            <input type="hidden" name="specPositionOther" value={specPositionOther} />
            <HiddenList name="specExperience" values={specExperience} />
            <HiddenList name="specSearchStatus" values={specStatus} />
            <HiddenList name="specWorkFormat" values={specWorkFormat} />
            <input type="hidden" name="specCity" value={specCity} />
            <HiddenList name="specRelocation" values={specRelocation} />
            <HiddenList name="specEmployment" values={specEmployment} />
            <input type="hidden" name="specDuties" value={specDuties} />
            <HiddenList name="specShiftSchemes" values={specShiftSchemes} />
            <HiddenList name="specShiftLength" values={specShiftLength} />
            <HiddenList name="specPriorityShifts" values={specPriorityShifts} />
            <HiddenList name="specWeekends" values={specWeekends} />
            <HiddenList name="specPayFormat" values={specPayFormat} />
            <input type="hidden" name="specSalary" value={specSalary} />
            <HiddenList name="specPayFrequency" values={specPayFrequency} />
            <HiddenList name="specPayMethod" values={specPayMethod} />
            <HiddenList name="specTraining" values={specTraining} />
            <HiddenList name="specImportant" values={specImportant} />
            <HiddenList name="specCareerGrowth" values={specCareerGrowth} />
            <HiddenList name="specPenalties" values={specPenalties} />
            <input type="hidden" name="specAdditionalWishes" value={specAdditionalWishes} />
            <HiddenList name="specLanguages" values={specLanguages} />
            <input type="hidden" name="specKeySkills" value={specKeySkills} />
            <HiddenList name="specPrograms" values={specPrograms} />
            <input type="hidden" name="specPortfolio" value={specPortfolio} />
            <input type="hidden" name="specAboutMe" value={specAboutMe} />
            <input type="hidden" name="specSocialLinks" value={specSocialLinks} />
            <input type="hidden" name="specContactPerson" value={specContactPerson} />
            <input type="hidden" name="specContactComm" value={specContactComm} />
            <input type="hidden" name="specResumeLink" value={specResumeLink} />
            <input type="hidden" name="about" value={join([join(specPosition), join(specStatus), join(specEmployment)]) || "Резюме специалиста"} />
            <input type="hidden" name="bio" value={join([join(specPosition), join(specStatus), join(specEmployment)]) || "Резюме специалиста"} />
          </>
        )}

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

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── MODEL STEPS 1-10 (step indices 1-10) ── */}
        {/* ══════════════════════════════════════════════════════════ */}

        {/* ── Model Step 1 (О модели): gender + age ── */}
        <div className={step === 1 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О модели</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Пол <span className="text-hot">*</span></span>
            <ChipGroup options={modelResumeOptions.gender} value={gender} onChange={setGender} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Возраст <span className="text-hot">*</span></span>
            <input
              className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot"
              type="number"
              min="18"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
            />
          </div>
        </div>

        {/* ── Model Step 2 (Формат): work format, city, citizenship ── */}
        <div className={step === 2 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Формат работы</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Формат работы</span>
            <ChipGroup options={modelResumeOptions.workFormat} value={formatValue} onChange={(next) => {
              setFormatValue(next);
              if (next[0] === "Только онлайн (из дома)") setCity("Удаленно");
              else if (city === "Удаленно") setCity("");
            }} />
          </div>
          {formatValue[0] !== "Только онлайн (из дома)" && (
            <div>
              <span className="mb-2 block text-sm font-semibold">Город</span>
              <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город / район" />
            </div>
          )}
          <div>
            <span className="mb-2 block text-sm font-semibold">Гражданство</span>
            <ChipGroup options={modelResumeOptions.citizenship} value={citizenship} onChange={setCitizenship} />
          </div>
        </div>

        {/* ── Model Step 3 (О работе): categories, experience, search status ── */}
        <div className={step === 3 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О работе</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Категория работы</span>
            <ChipGroup options={modelResumeOptions.categories} value={categoryValue} onChange={setCategoryValue} multi otherPlaceholder="Уточните категорию" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Опыт работы</span>
            <ChipGroup options={modelResumeOptions.experience} value={experienceValue} onChange={setExperienceValue} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Статус поиска</span>
            <ChipGroup options={modelResumeOptions.searchStatus} value={statusValue} onChange={setStatusValue} />
          </div>
        </div>

        {/* ── Model Step 4 (Навыки): sites, appearance ── */}
        <div className={step === 4 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Навыки</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Площадки</span>
            <ChipGroup options={modelResumeOptions.sites} value={sitesValue} onChange={setSitesValue} multi otherPlaceholder="Уточните сайт" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Типаж внешности</span>
            <ChipGroup options={modelResumeOptions.appearance} value={appearanceValue} onChange={setAppearanceValue} />
          </div>
        </div>

        {/* ── Model Step 5 (Нагрузка): shifts, hours, income ── */}
        <div className={step === 5 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Нагрузка</h2>
          <div>
            <span className="block text-sm font-semibold">Смен в неделю</span>
            <div className="text-2xl font-bold text-hot">{shifts}</div>
            <input className="w-full accent-hot" type="range" min="1" max="7" value={shifts} onChange={(e) => setShifts(Number(e.target.value))} />
          </div>
          <div>
            <span className="block text-sm font-semibold">Длительность смены (часов)</span>
            <div className="text-2xl font-bold text-hot">{hours}ч</div>
            <input className="w-full accent-hot" type="range" min="2" max="12" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Средний доход за смену</span>
            <ChipGroup options={modelResumeOptions.incomePerShift} value={incomeValue} onChange={setIncomeValue} />
          </div>
        </div>

        {/* ── Model Step 6 (Деньги): percent w/ importance, payout freq, pay method, penalties ── */}
        <div className={step === 6 && role === "model" ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Деньги</h2>
          <ReqCard label="Мин. процент от заработка" field="minimumPercent" importance={importance} setImportance={setImportance}>
            <div className="text-2xl font-bold text-hot">{percent}%</div>
            <input className="w-full accent-hot" type="range" min="0" max="100" value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </ReqCard>
          <div className="rounded-2xl border border-[#E4E4E1] p-3">
            <span className="mb-2 block text-sm font-semibold text-ink">Периодичность выплат <span className="text-hot">*</span></span>
            <ChipGroup options={modelResumeOptions.payoutFrequency} value={payoutFrequencyValue} onChange={setPayoutFrequencyValue} />
          </div>
          <div className="rounded-2xl border border-[#E4E4E1] p-3">
            <span className="mb-2 block text-sm font-semibold text-ink">Способ выплаты <span className="text-hot">*</span></span>
            <ChipGroup options={modelResumeOptions.payMethod} value={payMethodValue} onChange={setPayMethodValue} multi />
          </div>
          <div className="rounded-2xl border border-[#E4E4E1] p-3">
            <span className="mb-2 block text-sm font-semibold text-ink">Штрафы <span className="text-hot">*</span></span>
            <ChipGroup options={modelResumeOptions.penalties} value={penaltyValue} onChange={setPenaltyValue} />
          </div>
        </div>

        {/* ── Model Step 7 (Условия): rooms textarea, equipment, shift time, amenities ── */}
        <div className={step === 7 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Условия</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Пожелания к комнате</span>
            <textarea className="min-h-20 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={roomsText} onChange={(e) => setRoomsText(e.target.value)} placeholder="Опишите пожелания к рабочему пространству..." />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Оборудование</span>
            <ChipGroup options={modelResumeOptions.equipment} value={equipmentValue} onChange={setEquipmentValue} multi />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Приоритетное время смены</span>
            <ChipGroup options={modelResumeOptions.shiftTime} value={shiftTimeValue} onChange={setShiftTimeValue} multi />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Удобства</span>
            <ChipGroup options={modelResumeOptions.amenities} value={amenitiesValue} onChange={setAmenitiesValue} multi />
          </div>
        </div>

        {/* ── Model Step 8 (Команда): team comfort, admin gender ── */}
        <div className={step === 8 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Команда</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Комфортный состав коллектива</span>
            <ChipGroup options={modelResumeOptions.teamComfort} value={teamComfort} onChange={setTeamComfort} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Пол администраторов</span>
            <ChipGroup options={modelResumeOptions.adminGender} value={adminGender} onChange={setAdminGender} />
          </div>
        </div>

        {/* ── Model Step 9 (Пожелания): free text ── */}
        <div className={step === 9 && role === "model" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Пожелания</h2>
          <textarea className="min-h-28 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={wishesText} onChange={(e) => setWishesText(e.target.value)} placeholder="Напишите, если есть что-то еще важное..." />
        </div>

        {/* ── Model Step 10 (Контакты): telegram/phone, email ── */}
        <div className={step === 10 && role === "model" ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Контакты</h2>
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telegram *" />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон *" />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (необязательно)" />
          <p className="text-xs leading-5 text-zinc-500">Контакт видят авторизованные пользователи.</p>
        </div>

        {/* ── Model Step 11 (Итог): summary ── */}
        <div className={step === 11 && role === "model" ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Резюме готово</h2>
          <div className="h-2 overflow-hidden rounded-full bg-[#E4E4E1]">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fill}%` }} />
          </div>
          <p className="text-xs text-zinc-500">Заполнено на {fill}%</p>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О модели</p>
            <SummaryRow label="Пол" value={join(gender)} />
            <SummaryRow label="Возраст" value={age ? `${age} лет` : ""} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Формат</p>
            <SummaryRow label="Формат работы" value={join(formatValue)} />
            <SummaryRow label="Город" value={city} />
            <SummaryRow label="Гражданство" value={join(citizenship)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О работе</p>
            <SummaryRow label="Категории" value={join(categoryValue)} />
            <SummaryRow label="Опыт" value={join(experienceValue)} />
            <SummaryRow label="Статус" value={join(statusValue)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Навыки</p>
            <SummaryRow label="Площадки" value={join(sitesValue)} />
            <SummaryRow label="Типаж" value={join(appearanceValue)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Нагрузка</p>
            <SummaryRow label="Смены" value={`${shifts} в неделю по ${hours}ч`} />
            <SummaryRow label="Доход за смену" value={join(incomeValue)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Деньги</p>
            <RequirementSummaryRow label="Мин. процент" value={`${percent}%`} level={importance.minimumPercent || "none"} />
            <SummaryRow label="Частота выплат" value={join(payoutFrequencyValue)} />
            <SummaryRow label="Способ выплаты" value={join(payMethodValue)} />
            <SummaryRow label="Штрафы" value={join(penaltyValue)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Условия</p>
            <SummaryRow label="Комната" value={roomsText} />
            <SummaryRow label="Оборудование" value={join(equipmentValue)} />
            <SummaryRow label="Время смены" value={join(shiftTimeValue)} />
            <SummaryRow label="Удобства" value={join(amenitiesValue)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Команда</p>
            <SummaryRow label="Коллектив" value={join(teamComfort)} />
            <SummaryRow label="Пол администраторов" value={join(adminGender)} />
          </div>
          {wishesText && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Пожелания</p>
              <SummaryRow label="Доп. пожелания" value={wishesText} />
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Контакты</p>
            <SummaryRow label="Telegram" value={contact} />
            <SummaryRow label="Телефон" value={phone} />
            <SummaryRow label="Email" value={email} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── SPECIALIST STEPS 1-7 (step indices 1-7) ── */}
        {/* ══════════════════════════════════════════════════════════ */}

        {/* ── Specialist Step 1 (О специалисте): position, experience, search status ── */}
        <div className={step === 1 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О специалисте</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Должность <span className="text-hot">*</span></span>
            <ChipGroup options={specialistResumeOptions.positions} value={specPosition} onChange={(next) => {
              setSpecPosition(next);
              if (!next.includes("Другое")) setSpecPositionOther("");
            }} otherPlaceholder="Уточните должность" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Опыт работы <span className="text-hot">*</span></span>
            <ChipGroup options={specialistResumeOptions.experience} value={specExperience} onChange={setSpecExperience} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Статус поиска</span>
            <ChipGroup options={specialistResumeOptions.searchStatus} value={specStatus} onChange={setSpecStatus} />
          </div>
        </div>

        {/* ── Specialist Step 2 (О себе): work format, city, relocation, employment, duties ── */}
        <div className={step === 2 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О себе</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Формат работы</span>
            <ChipGroup options={specialistResumeOptions.workFormat} value={specWorkFormat} onChange={(next) => {
              setSpecWorkFormat(next);
              if (next[0] === "Удалённо") setSpecCity("Удалённо");
              else if (specCity === "Удалённо") setSpecCity("");
            }} />
          </div>
          {specWorkFormat[0] !== "Удалённо" && (
            <div>
              <span className="mb-2 block text-sm font-semibold">Город</span>
              <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specCity} onChange={(e) => setSpecCity(e.target.value)} placeholder="Город / район" />
            </div>
          )}
          <div>
            <span className="mb-2 block text-sm font-semibold">Готовность к релокации</span>
            <ChipGroup options={specialistResumeOptions.relocation} value={specRelocation} onChange={setSpecRelocation} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Тип занятости</span>
            <ChipGroup options={specialistResumeOptions.employment} value={specEmployment} onChange={setSpecEmployment} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Обязанности <span className="text-hot">*</span></span>
            <textarea className="min-h-20 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={specDuties} onChange={(e) => setSpecDuties(e.target.value)} placeholder="Опишите желаемые обязанности..." />
          </div>
        </div>

        {/* ── Specialist Step 3 (График): shift schemes, shift length, priority shifts, weekends ── */}
        <div className={step === 3 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">График</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Схема смен</span>
            <ChipGroup options={specialistResumeOptions.shiftSchemes} value={specShiftSchemes} onChange={setSpecShiftSchemes} multi />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Длительность смены</span>
            <ChipGroup options={specialistResumeOptions.shiftLength} value={specShiftLength} onChange={setSpecShiftLength} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Приоритетные смены</span>
            <ChipGroup options={specialistResumeOptions.shiftTime} value={specPriorityShifts} onChange={setSpecPriorityShifts} multi />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Выходные</span>
            <ChipGroup options={specialistResumeOptions.weekends} value={specWeekends} onChange={setSpecWeekends} />
          </div>
        </div>

        {/* ── Specialist Step 4 (Зарплата): pay format, salary, pay frequency, pay method ── */}
        <div className={step === 4 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Зарплата</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Формат оплаты</span>
            <ChipGroup options={specialistResumeOptions.payFormat} value={specPayFormat} onChange={setSpecPayFormat} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Ожидаемая зарплата <span className="text-hot">*</span></span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specSalary} onChange={(e) => setSpecSalary(e.target.value)} placeholder="Например, $500" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Периодичность выплат</span>
            <ChipGroup options={specialistResumeOptions.payFrequency} value={specPayFrequency} onChange={setSpecPayFrequency} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Способ выплаты</span>
            <ChipGroup options={specialistResumeOptions.payMethod} value={specPayMethod} onChange={setSpecPayMethod} multi />
          </div>
        </div>

        {/* ── Specialist Step 5 (Условия): training, what's important, career growth, penalties, additional wishes ── */}
        <div className={step === 5 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Условия</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Обучение</span>
            <ChipGroup options={specialistResumeOptions.training} value={specTraining} onChange={setSpecTraining} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Что важно</span>
            <ChipGroup options={specialistResumeOptions.importantConditions} value={specImportant} onChange={setSpecImportant} multi />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Карьерный рост</span>
            <ChipGroup options={specialistResumeOptions.careerGrowth} value={specCareerGrowth} onChange={setSpecCareerGrowth} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Штрафы</span>
            <ChipGroup options={specialistResumeOptions.penalties} value={specPenalties} onChange={setSpecPenalties} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Дополнительные пожелания</span>
            <textarea className="min-h-20 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={specAdditionalWishes} onChange={(e) => setSpecAdditionalWishes(e.target.value)} placeholder="Напишите, если есть что-то ещё..." />
          </div>
        </div>

        {/* ── Specialist Step 6 (Навыки): languages, key skills, programs, portfolio ── */}
        <div className={step === 6 && role === "specialist" ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Навыки</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Языки <span className="text-hot">*</span></span>
            <ChipGroup options={specialistResumeOptions.languages} value={specLanguages} onChange={setSpecLanguages} multi otherPlaceholder="Уточните язык" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Ключевые навыки</span>
            <textarea className="min-h-20 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={specKeySkills} onChange={(e) => setSpecKeySkills(e.target.value)} placeholder="Опишите ваши ключевые навыки..." />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Программы / сервисы</span>
            <ChipGroup options={specialistResumeOptions.programs} value={specPrograms} onChange={setSpecPrograms} multi otherPlaceholder="Уточните программу" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Портфолио</span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specPortfolio} onChange={(e) => setSpecPortfolio(e.target.value)} placeholder="Ссылка на портфолио" />
          </div>
        </div>

        {/* ── Specialist Step 7 (Контакты): about me, social links, contact person, contact comm, resume link ── */}
        <div className={step === 7 && role === "specialist" ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Контакты</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">О себе</span>
            <textarea className="min-h-20 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={specAboutMe} onChange={(e) => setSpecAboutMe(e.target.value)} placeholder="Расскажите о себе..." />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Соцсети / ссылки</span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specSocialLinks} onChange={(e) => setSpecSocialLinks(e.target.value)} placeholder="LinkedIn, Telegram-канал и т.д." />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Контактное лицо</span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specContactPerson} onChange={(e) => setSpecContactPerson(e.target.value)} placeholder="Имя" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Контакт для связи <span className="text-hot">*</span></span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specContactComm} onChange={(e) => setSpecContactComm(e.target.value)} placeholder="Telegram / телефон / email" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Ссылка на резюме / файл</span>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={specResumeLink} onChange={(e) => setSpecResumeLink(e.target.value)} placeholder="Ссылка или загрузите файл" />
          </div>
          <p className="text-xs leading-5 text-zinc-500">Контакт видят авторизованные пользователи.</p>
        </div>

        {/* ── Specialist Step 8 (Итог): summary ── */}
        <div className={step === 8 && role === "specialist" ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Резюме готово</h2>
          <div className="h-2 overflow-hidden rounded-full bg-[#E4E4E1]">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fill}%` }} />
          </div>
          <p className="text-xs text-zinc-500">Заполнено на {fill}%</p>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О специалисте</p>
            <SummaryRow label="Должность" value={join(specPosition)} />
            <SummaryRow label="Опыт" value={join(specExperience)} />
            <SummaryRow label="Статус" value={join(specStatus)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">О себе</p>
            <SummaryRow label="Формат работы" value={join(specWorkFormat)} />
            <SummaryRow label="Город" value={specCity} />
            <SummaryRow label="Релокация" value={join(specRelocation)} />
            <SummaryRow label="Занятость" value={join(specEmployment)} />
            <SummaryRow label="Обязанности" value={specDuties} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">График</p>
            <SummaryRow label="Схема смен" value={join(specShiftSchemes)} />
            <SummaryRow label="Длительность" value={join(specShiftLength)} />
            <SummaryRow label="Приоритетные смены" value={join(specPriorityShifts)} />
            <SummaryRow label="Выходные" value={join(specWeekends)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Зарплата</p>
            <SummaryRow label="Формат оплаты" value={join(specPayFormat)} />
            <SummaryRow label="Ожидаемая зарплата" value={specSalary} />
            <SummaryRow label="Периодичность" value={join(specPayFrequency)} />
            <SummaryRow label="Способ выплаты" value={join(specPayMethod)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Условия</p>
            <SummaryRow label="Обучение" value={join(specTraining)} />
            <SummaryRow label="Что важно" value={join(specImportant)} />
            <SummaryRow label="Карьерный рост" value={join(specCareerGrowth)} />
            <SummaryRow label="Штрафы" value={join(specPenalties)} />
            {specAdditionalWishes && <SummaryRow label="Доп. пожелания" value={specAdditionalWishes} />}
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Навыки</p>
            <SummaryRow label="Языки" value={join(specLanguages)} />
            <SummaryRow label="Ключевые навыки" value={specKeySkills} />
            <SummaryRow label="Программы" value={join(specPrograms)} />
            <SummaryRow label="Портфолио" value={specPortfolio} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-zinc-500">Контакты</p>
            <SummaryRow label="О себе" value={specAboutMe} />
            <SummaryRow label="Соцсети" value={specSocialLinks} />
            <SummaryRow label="Контактное лицо" value={specContactPerson} />
            <SummaryRow label="Контакт для связи" value={specContactComm} />
            <SummaryRow label="Резюме" value={specResumeLink} />
          </div>
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
