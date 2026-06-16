"use client";

import { useMemo, useState } from "react";
import type { createResumeAction } from "@/app/actions";

type ResumeDraft = {
  title: string;
  roleGoal: string;
  city: string;
  experienceMonths: number;
  contactEmail: string;
  contactTelegram: string;
};

type ModelResumeFormProps = {
  action: typeof createResumeAction;
  resume?: Partial<ResumeDraft> | null;
};

const ageRanges = ["18-20", "21-25", "26-30", "31+"];
const experienceOptions = [
  ["0", "Новичок (0-1 мес)"],
  ["3", "Есть небольшой опыт (1-6 мес)"],
  ["9", "Опытная (6-12 мес)"],
  ["18", "Профи (1+ год)"]
];
const shiftPerWeekOptions = ["3-4", "4-5", "5-6", "Гибкий график"];
const shiftPerMonthOptions = ["12-16", "16-20", "20-24", "24+", "Гибко"];
const shiftLengthOptions = ["4-5 часов", "6 часов", "8 часов", "10+ часов"];
const disciplineOptions = ["Никогда", "Крайне редко", "Иногда бывают форс-мажоры"];
const extraShiftOptions = ["Да", "Нет", "По договоренности"];
const percentOptions = ["50%", "55%", "60%", "65%", "70% и выше"];
const payoutOptions = ["Еженедельно", "Два раза в месяц", "По запросу"];
const interiorOptions = ["Без разницы", "Нейтральный / лофт", "Розовая / нежная тема", "Кухня / гостиная", "Темная / неоновая"];
const languageOptions = ["Русский", "Английский базовый", "Английский свободный", "Другой"];
const equipmentOptions = [
  "Камера не ниже Logitech Brio / Link 2",
  "DSLR / беззеркальная камера",
  "Профессиональный свет",
  "Мощный ПК"
];
const roomOptions = [
  "Комната не менее 10 кв.м.",
  "Окно / естественный свет",
  "Кондиционер / сплит-система",
  "Хорошая звукоизоляция"
];
const orgOptions = ["Одежда / белье от студии", "Бесплатные обеды / перекусы", "Личный саппорт на смене"];
const stopOptions = [
  "Штрафы за низкий онлайн",
  "Принуждение к определенным видам шоу",
  "Работа без выходных",
  "Грубость саппорта"
];

function CheckboxGroup({ name, options }: { name: string; options: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label key={option} className="flex items-start gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
          <input className="mt-1" type="checkbox" name={name} value={option} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-zinc-800">{children}</label>;
}

export function ModelResumeForm({ action, resume }: ModelResumeFormProps) {
  const [about, setAbout] = useState("");
  const title = resume?.title || "Резюме вебкам-модели";
  const city = resume?.city || "";

  const preview = useMemo(
    () =>
      about.trim() ||
      "Заполните форму: краткое описание появится здесь, а остальные требования будут собраны сервером в структурированное резюме.",
    [about]
  );

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Резюме модели (структурированный шаблон)</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            Заполнение занимает около 5 минут. Студия должна за 10 секунд понять график, минимальный процент,
            условия комнаты, оборудование и стоп-лист.
          </p>
        </div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">для матчинга</span>
      </div>

      <form action={action} className="mt-5 space-y-5">
        <input type="hidden" name="resumeTemplate" value="model-v1" />
        <input type="hidden" name="roleGoal" value="Модель" />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <FieldLabel>Заголовок резюме</FieldLabel>
            <input className="rounded border p-2" name="title" defaultValue={title} required />
          </div>
          <div className="grid gap-1">
            <FieldLabel>Город / часовой пояс</FieldLabel>
            <input className="rounded border p-2" name="city" defaultValue={city} placeholder="Москва (МСК) или Удаленно (GMT+3)" />
          </div>
          <div className="grid gap-1">
            <FieldLabel>Возраст</FieldLabel>
            <select className="rounded border p-2" name="ageRange" defaultValue="21-25">
              {ageRanges.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Опыт работы</FieldLabel>
            <select className="rounded border p-2" name="experienceMonths" defaultValue={String(resume?.experienceMonths ?? 0)}>
              {experienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <FieldLabel>Языки общения на камере</FieldLabel>
          <CheckboxGroup name="languages" options={languageOptions} />
        </div>

        <div className="grid gap-1">
          <FieldLabel>О себе и стиль работы</FieldLabel>
          <textarea
            className="rounded border p-2"
            name="about"
            rows={4}
            maxLength={300}
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="2-3 предложения: стиль работы, цели, что важно в студии. До 300 символов."
            required
          />
          <p className="text-xs text-zinc-500">{about.length}/300</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <FieldLabel>Смен в неделю</FieldLabel>
            <select className="rounded border p-2" name="shiftsPerWeek">{shiftPerWeekOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Смен в месяц</FieldLabel>
            <select className="rounded border p-2" name="shiftsPerMonth">{shiftPerMonthOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Длительность смены</FieldLabel>
            <select className="rounded border p-2" name="shiftLength">{shiftLengthOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Пропуски смен</FieldLabel>
            <select className="rounded border p-2" name="missedShifts">{disciplineOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Доп. смены / праздники</FieldLabel>
            <select className="rounded border p-2" name="extraShifts">{extraShiftOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <FieldLabel>Минимальный процент</FieldLabel>
            <select className="rounded border p-2" name="minimumPercent">{percentOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="grid gap-1">
            <FieldLabel>Минимальный доход в месяц</FieldLabel>
            <input className="rounded border p-2" name="minimumIncome" placeholder="$1500" />
          </div>
          <div className="grid gap-1">
            <FieldLabel>Частота выплат</FieldLabel>
            <select className="rounded border p-2" name="payoutFrequency">{payoutOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
        </div>

        <div className="grid gap-3">
          <FieldLabel>Строго обязательное оборудование</FieldLabel>
          <CheckboxGroup name="equipmentRequirements" options={equipmentOptions} />
          <FieldLabel>Строго обязательные условия комнаты</FieldLabel>
          <CheckboxGroup name="roomRequirements" options={roomOptions} />
          <div className="grid gap-1 md:max-w-md">
            <FieldLabel>Предпочтительный интерьер</FieldLabel>
            <select className="rounded border p-2" name="interiorStyle">{interiorOptions.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <FieldLabel>Организационные условия</FieldLabel>
          <CheckboxGroup name="orgRequirements" options={orgOptions} />
        </div>

        <div className="grid gap-3">
          <FieldLabel>Стоп-студии и запрещенные условия</FieldLabel>
          <textarea className="rounded border p-2" name="blockedStudios" rows={3} placeholder="Названия студий или юр. лиц, которые не рассматриваете" />
          <CheckboxGroup name="stopConditions" options={stopOptions} />
          <input className="rounded border p-2" name="stopOther" placeholder="Другое стоп-условие" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded border p-2" name="contactEmail" defaultValue={resume?.contactEmail || ""} placeholder="Email (скрыто от гостей)" />
          <input className="rounded border p-2" name="contactTelegram" defaultValue={resume?.contactTelegram || ""} placeholder="Telegram / телефон (скрыто от гостей)" />
        </div>

        <label className="flex items-start gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <input className="mt-1" type="checkbox" name="resumeConfirm" required />
          <span>Я подтверждаю, что требования актуальны. Если студия предложит условия хуже указанных, я могу отказаться.</span>
        </label>

        <input type="hidden" name="bio" value={preview} />
        <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">Короткий блок “о себе”:</span>
          <p className="mt-1">{preview}</p>
        </div>

        <button className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white md:w-auto" type="submit">
          Сохранить резюме
        </button>
      </form>
    </section>
  );
}
