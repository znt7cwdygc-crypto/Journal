"use client";

import { useMemo, useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type ResumeDraft = {
  title: string;
  roleGoal: string;
  city: string | null;
  experienceMonths: number;
  contactEmail: string | null;
  contactTelegram: string | null;
};

type Importance = "must" | "nice" | "none";

type ModelResumeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  resume?: Partial<ResumeDraft> | null;
};

const steps = ["Старт", "О себе", "Нагрузка", "Площадки", "Деньги", "Студия", "Команда", "Пожелания", "Контакты", "Итог"];
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
const equipment = ["ПК/ноутбук", "Камера", "Свет", "Реквизит/костюмы", "Стабильный интернет"];
const studioSchedule = ["Фиксированные смены", "Свободный график", "Гибрид"];
const security = ["Охрана на территории", "Тревожная кнопка", "Анонимность"];
const amenities = ["Зона отдыха/кухня", "Душ", "Парковка", "Гримёрная/визажист", "Шкафчик", "Медпомощь"];
const teamOptions = ["Только девушки", "Только парни", "Смешанный", "Без разницы"];
const adminOptions = ["Только женщины", "Только мужчины", "Смешанный", "Без разницы"];
const managerOptions = ["Женщина", "Мужчина", "Без разницы"];
const quickWishes = ["Без испытательного срока", "Можно совмещать с учёбой", "Студия рядом с метро", "Гибкий старт смены", "Помощь с продвижением профиля"];

const requirementFields = [
  "minimumPercent",
  "payFormat",
  "payoutFrequency",
  "payMethod",
  "bonus",
  "penalty",
  "room",
  "equipmentRequirements",
  "studioSchedule",
  "security",
  "location",
  "amenities",
  "modelsTeam",
  "adminsGender",
  "managerGender"
];

function experienceMonthsFromLabel(label: string) {
  if (label.includes("3-6")) return 4;
  if (label.includes("6-12")) return 9;
  if (label.includes("1-3")) return 24;
  if (label.includes("Более")) return 48;
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

export function ModelResumeForm({ action, resume }: ModelResumeFormProps) {
  const [step, setStep] = useState(0);
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
  const [wishes, setWishes] = useState<string[]>([]);
  const [wishesText, setWishesText] = useState("");
  const [contact, setContact] = useState(resume?.contactTelegram || "");
  const [email, setEmail] = useState(resume?.contactEmail || "");
  const [importance, setImportanceState] = useState<Record<string, Importance>>({});
  const quizRef = useRef<HTMLElement | null>(null);
  const lastStep = step === steps.length - 1;
  const progress = Math.round((step / (steps.length - 1)) * 100);
  const title = resume?.title || `Резюме модели${location ? `, ${location}` : ""}`;
  const expMonths = experienceMonthsFromLabel(experienceValue[0] || "");
  const fill = useMemo(() => {
    const groups = [categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, languagesValue, payFormatValue, payFrequencyValue, payMethodValue, roomValue, equipmentValue, scheduleValue, securityValue, amenitiesValue, modelsTeam, adminsGender, managerGender];
    return Math.round((groups.filter((group) => group.length > 0).length / groups.length) * 100);
  }, [categoryValue, experienceValue, statusValue, formatValue, incomeValue, sitesValue, languagesValue, payFormatValue, payFrequencyValue, payMethodValue, roomValue, equipmentValue, scheduleValue, securityValue, amenitiesValue, modelsTeam, adminsGender, managerGender]);

  function setImportance(field: string, value: Importance) {
    setImportanceState((current) => ({ ...current, [field]: value }));
  }

  function goToStep(nextStep: number) {
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    window.setTimeout(() => quizRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  return (
    <section ref={quizRef} className="quiz-shell border-[#E4E4E1] bg-white" data-quiz-root>
      <div className="quiz-header bg-white">
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Шаг {step + 1} из {steps.length}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E4E1]">
          <div className="h-full rounded-full bg-hot transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form action={action} className="quiz-body bg-white">
        <input type="hidden" name="resumeTemplate" value="model-quiz-v2" />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="roleGoal" value="Модель" />
        <input type="hidden" name="city" value={location} />
        <input type="hidden" name="experienceMonths" value={expMonths} />
        <input type="hidden" name="minimumPercent" value={`${percent}%`} />
        <input type="hidden" name="shiftsPerWeek" value={`${shifts} смены`} />
        <input type="hidden" name="shiftLength" value={`${hours} часов`} />
        <input type="hidden" name="contactTelegram" value={contact} />
        <input type="hidden" name="contactEmail" value={email} />
        <input type="hidden" name="about" value={join([join(categoryValue), join(statusValue), join(formatValue)]) || "Резюме модели"} />
        <input type="hidden" name="bio" value={join([join(categoryValue), join(statusValue), join(formatValue)]) || "Резюме модели"} />
        <input type="hidden" name="resumeConfirm" value="on" />
        {requirementFields.map((field) => <input key={field} type="hidden" name={`${field}Importance`} value={importance[field] || "none"} />)}
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
        <HiddenList name="quickWishes" values={wishes} />
        <input type="hidden" name="wishesText" value={wishesText} />

        <div className={step === 0 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-2xl font-bold leading-tight text-ink">Резюме модели</h2>
          <p className="text-sm leading-6 text-zinc-500">Расскажите о себе и требованиях к студии. Чем подробнее анкета, тем точнее отклики.</p>
          <div className="rounded-2xl border border-[#E4E4E1] p-4">
            <span className="block text-sm font-semibold text-ink">Это займет около 5 минут</span>
            <p className="mt-1 text-sm leading-5 text-zinc-500">После публикации резюме можно редактировать в личном кабинете.</p>
          </div>
        </div>

        <div className={step === 1 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">О себе</h2>
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
        </div>

        <div className={step === 2 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Формат и нагрузка</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Формат работы</span>
            <ChipGroup options={formats} value={formatValue} onChange={setFormatValue} />
          </div>
          <div>
            <span className="block text-sm font-semibold">Смен в неделю</span>
            <div className="text-2xl font-bold text-hot">{shifts} смены</div>
            <input className="w-full accent-hot" type="range" min="1" max="7" value={shifts} onChange={(event) => setShifts(Number(event.target.value))} />
          </div>
          <div>
            <span className="block text-sm font-semibold">Длительность смены</span>
            <div className="text-2xl font-bold text-hot">{hours} часов</div>
            <input className="w-full accent-hot" type="range" min="2" max="12" value={hours} onChange={(event) => setHours(Number(event.target.value))} />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Средний доход за смену сейчас</span>
            <ChipGroup options={incomes} value={incomeValue} onChange={setIncomeValue} />
          </div>
        </div>

        <div className={step === 3 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Площадки и языки</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Доступные сайты</span>
            <ChipGroup options={sites} value={sitesValue} onChange={setSitesValue} multi otherPlaceholder="Уточните сайт" />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">Языки общения</span>
            <ChipGroup options={languages} value={languagesValue} onChange={setLanguagesValue} multi otherPlaceholder="Уточните язык" />
          </div>
        </div>

        <div className={step === 4 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Финансовые требования</h2>
          <ReqCard label="Минимальный процент от заработка" field="minimumPercent" importance={importance} setImportance={setImportance}>
            <div className="text-2xl font-bold text-hot">{percent}%</div>
            <input className="w-full accent-hot" type="range" min="0" max="100" value={percent} onChange={(event) => setPercent(Number(event.target.value))} />
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
        </div>

        <div className={step === 5 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Условия и комфорт</h2>
          <ReqCard label="Тип комнаты" field="room" importance={importance} setImportance={setImportance}>
            <ChipGroup options={rooms} value={roomValue} onChange={setRoomValue} />
          </ReqCard>
          <ReqCard label="Оборудование предоставляется" field="equipmentRequirements" importance={importance} setImportance={setImportance}>
            <ChipGroup options={equipment} value={equipmentValue} onChange={setEquipmentValue} multi />
          </ReqCard>
          <ReqCard label="График работы" field="studioSchedule" importance={importance} setImportance={setImportance}>
            <ChipGroup options={studioSchedule} value={scheduleValue} onChange={setScheduleValue} />
          </ReqCard>
          <ReqCard label="Безопасность" field="security" importance={importance} setImportance={setImportance}>
            <ChipGroup options={security} value={securityValue} onChange={setSecurityValue} multi />
          </ReqCard>
          <ReqCard label="Локация" field="location" importance={importance} setImportance={setImportance}>
            <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-2 text-sm outline-none focus:border-hot" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Город / район" />
          </ReqCard>
          <ReqCard label="Удобства" field="amenities" importance={importance} setImportance={setImportance}>
            <ChipGroup options={amenities} value={amenitiesValue} onChange={setAmenitiesValue} multi />
          </ReqCard>
        </div>

        <div className={step === 6 ? "quiz-content space-y-3" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Состав коллектива</h2>
          <ReqCard label="Состав моделей на студии" field="modelsTeam" importance={importance} setImportance={setImportance}>
            <ChipGroup options={teamOptions} value={modelsTeam} onChange={setModelsTeam} />
          </ReqCard>
          <ReqCard label="Пол администраторов/коучей/тренеров" field="adminsGender" importance={importance} setImportance={setImportance}>
            <ChipGroup options={adminOptions} value={adminsGender} onChange={setAdminsGender} />
          </ReqCard>
          <ReqCard label="Пол управляющего/директора" field="managerGender" importance={importance} setImportance={setImportance}>
            <ChipGroup options={managerOptions} value={managerGender} onChange={setManagerGender} />
          </ReqCard>
        </div>

        <div className={step === 7 ? "quiz-content space-y-5" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Дополнительные пожелания</h2>
          <div>
            <span className="mb-2 block text-sm font-semibold">Быстрый выбор</span>
            <ChipGroup options={quickWishes} value={wishes} onChange={setWishes} multi />
          </div>
          <textarea className="min-h-28 w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm leading-6 outline-none focus:border-hot" value={wishesText} onChange={(event) => setWishesText(event.target.value)} placeholder="Напишите, если есть что-то еще важное..." />
        </div>

        <div className={step === 8 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Контакты</h2>
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Telegram / телефон" />
          <input className="w-full rounded-xl border border-[#E4E4E1] px-3 py-3 text-sm outline-none focus:border-hot" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email, необязательно" />
          <p className="text-xs leading-5 text-zinc-500">Контакт видят авторизованные пользователи.</p>
        </div>

        <div className={step === 9 ? "quiz-content space-y-4" : "hidden"}>
          <h2 className="text-xl font-bold text-ink">Резюме готово</h2>
          <div className="h-2 overflow-hidden rounded-full bg-[#E4E4E1]">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${fill}%` }} />
          </div>
          <p className="text-xs text-zinc-500">Заполнено на {fill}%</p>
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
            <SummaryRow label="Минимальный процент" value={`${percent}%`} />
            <SummaryRow label="Выплаты" value={`${join(payFormatValue)} · ${join(payFrequencyValue)}`} />
            <SummaryRow label="Комната" value={join(roomValue)} />
            <SummaryRow label="Оборудование" value={join(equipmentValue)} />
            <SummaryRow label="Локация" value={location} />
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
