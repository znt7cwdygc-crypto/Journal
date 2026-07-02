"use client";

import { useMemo, useState } from "react";

type Experience = "novice" | "mid" | "pro";
type Format = "studio" | "home";
type Gender = "female" | "trans" | "male";
type AgeGroup = "18-24" | "25-34" | "35+";
type BodyFeature = "small" | "medium" | "large";
type TypingSpeed = "slow" | "medium" | "fast";
type Explicitness = "closed" | "moderate" | "open" | "explicit";

// Диапазон валового дохода за час онлайна (USD), до вычета процента студии.
// Калибровка: средняя модель на студии (50%), 4 смены по 6ч/нед, умеренная откровенность —
// зарабатывает около $300 чистыми в неделю ⇒ ~$25/час валовых при модификаторе ≈ 1.
const perHourRange: Record<Experience, [number, number]> = {
  novice: [9, 18],
  mid: [18, 32],
  pro: [45, 90]
};

const experienceLabels: Record<Experience, string> = {
  novice: "Новичок (0-2 месяца)",
  mid: "Средний опыт (3-12 месяцев)",
  pro: "Опытная (1+ год)"
};

const ageLabels: Record<AgeGroup, string> = {
  "18-24": "18-24",
  "25-34": "25-34",
  "35+": "35+"
};

const bodyFeatureLabels: Record<BodyFeature, string> = {
  small: "Маленький",
  medium: "Средний",
  large: "Большой"
};

const explicitnessLabels: Record<Explicitness, string> = {
  closed: "Закрытый формат, без откровенного контента",
  moderate: "Умеренный, частичное обнажение",
  open: "Открытый соло-формат",
  explicit: "Готова на откровенные шоу"
};

const typingLabels: Record<TypingSpeed, string> = {
  slow: "Медленная",
  medium: "Средняя",
  fast: "Быстрая"
};

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString("ru-RU")}`;
}

export function SalaryCalculator() {
  const [experience, setExperience] = useState<Experience>("novice");
  const [format, setFormat] = useState<Format>("studio");
  const [shiftsPerWeek, setShiftsPerWeek] = useState(5);
  const [hoursPerShift, setHoursPerShift] = useState(6);
  const [studioPercent, setStudioPercent] = useState(50);

  const [gender, setGender] = useState<Gender>("female");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("18-24");
  const [bodyFeature, setBodyFeature] = useState<BodyFeature>("medium");
  const [babyface, setBabyface] = useState(false);
  const [artistry, setArtistry] = useState(3);
  const [positivity, setPositivity] = useState(3);
  const [typingSpeed, setTypingSpeed] = useState<TypingSpeed>("medium");
  const [explicitness, setExplicitness] = useState<Explicitness>("moderate");

  const result = useMemo(() => {
    const [min, max] = perHourRange[experience];
    const weeksPerMonth = 4.3;

    // Модификаторы спроса — умеренный диапазон (±25%), не абсолютные утверждения,
    // а статистическая тенденция по нишам.
    let modifier = 1;
    if (gender !== "male") modifier *= bodyFeature === "large" ? 1.08 : bodyFeature === "small" ? 0.96 : 1;
    modifier *= ageGroup === "18-24" ? 1.05 : ageGroup === "25-34" ? 1 : 0.96;
    modifier *= babyface ? 1.06 : 1;
    modifier *= 0.85 + artistry * 0.06; // 1..5 -> 0.91..1.15
    modifier *= 0.9 + positivity * 0.04; // 1..5 -> 0.94..1.1
    modifier *= typingSpeed === "fast" ? 1.06 : typingSpeed === "slow" ? 0.95 : 1;
    modifier *= explicitness === "explicit" ? 1.2 : explicitness === "open" ? 1.08 : explicitness === "moderate" ? 1 : 0.8;

    const hoursPerMonth = hoursPerShift * shiftsPerWeek * weeksPerMonth;
    const grossMin = min * hoursPerMonth * modifier;
    const grossMax = max * hoursPerMonth * modifier;

    if (format === "studio") {
      const keep = 1 - studioPercent / 100;
      return { grossMin, grossMax, netMin: grossMin * keep, netMax: grossMax * keep, modifier };
    }

    return { grossMin, grossMax, netMin: grossMin, netMax: grossMax, modifier };
  }, [experience, format, shiftsPerWeek, hoursPerShift, studioPercent, gender, ageGroup, bodyFeature, babyface, artistry, positivity, typingSpeed, explicitness]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Калькулятор дохода вебкам-модели</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Оценка на основе публичных данных индустрии и статистических тенденций по нишам. Это не гарантия дохода и не оценка вашей ценности как человека — только рыночный ориентир.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-zinc-500">Опыт</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={experience}
            onChange={(e) => setExperience(e.target.value as Experience)}
          >
            {(Object.keys(experienceLabels) as Experience[]).map((key) => (
              <option key={key} value={key}>{experienceLabels[key]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Формат работы</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
          >
            <option value="studio">Студия</option>
            <option value="home">Дома (весь доход себе)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">
            Смен в неделю: {shiftsPerWeek}
          </label>
          <input
            className="mt-2 w-full"
            type="range"
            min={1}
            max={7}
            step={1}
            value={shiftsPerWeek}
            onChange={(e) => setShiftsPerWeek(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">
            Часов онлайна за смену: {hoursPerShift}
          </label>
          <input
            className="mt-2 w-full"
            type="range"
            min={2}
            max={10}
            step={1}
            value={hoursPerShift}
            onChange={(e) => setHoursPerShift(Number(e.target.value))}
          />
        </div>

        {format === "studio" && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500">
              Процент студии: {studioPercent}%
            </label>
            <input
              className="mt-2 w-full"
              type="range"
              min={30}
              max={70}
              step={5}
              value={studioPercent}
              onChange={(e) => setStudioPercent(Number(e.target.value))}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Пол / формат</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <option value="female">Девушка</option>
            <option value="trans">Трансгендер</option>
            <option value="male">Мужчина</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Возраст</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
          >
            {(Object.keys(ageLabels) as AgeGroup[]).map((key) => (
              <option key={key} value={key}>{ageLabels[key]}</option>
            ))}
          </select>
        </div>

        {gender !== "male" && (
          <div>
            <label className="block text-xs font-semibold text-zinc-500">Размер груди</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
              value={bodyFeature}
              onChange={(e) => setBodyFeature(e.target.value as BodyFeature)}
            >
              {(Object.keys(bodyFeatureLabels) as BodyFeature[]).map((key) => (
                <option key={key} value={key}>{bodyFeatureLabels[key]}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-end gap-2 pb-1">
          <input
            id="babyface"
            type="checkbox"
            checked={babyface}
            onChange={(e) => setBabyface(e.target.checked)}
          />
          <label htmlFor="babyface" className="text-sm text-zinc-700">Бейбифейс (моложавая внешность)</label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Артистичность: {artistry}/5</label>
          <input
            className="mt-2 w-full"
            type="range"
            min={1}
            max={5}
            step={1}
            value={artistry}
            onChange={(e) => setArtistry(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Позитивность / энергичность: {positivity}/5</label>
          <input
            className="mt-2 w-full"
            type="range"
            min={1}
            max={5}
            step={1}
            value={positivity}
            onChange={(e) => setPositivity(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500">Скорость печати в чате</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={typingSpeed}
            onChange={(e) => setTypingSpeed(e.target.value as TypingSpeed)}
          >
            {(Object.keys(typingLabels) as TypingSpeed[]).map((key) => (
              <option key={key} value={key}>{typingLabels[key]}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-zinc-500">Готовность к откровенному контенту</label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm"
            value={explicitness}
            onChange={(e) => setExplicitness(e.target.value as Explicitness)}
          >
            {(Object.keys(explicitnessLabels) as Explicitness[]).map((key) => (
              <option key={key} value={key}>{explicitnessLabels[key]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Оценочный доход в месяц</p>
        <p className="mt-1 text-2xl font-bold text-ink">
          {formatUsd(result.netMin)} – {formatUsd(result.netMax)}
        </p>
        {format === "studio" && (
          <p className="mt-1 text-xs text-zinc-500">
            До вычета процента студии: {formatUsd(result.grossMin)} – {formatUsd(result.grossMax)}
          </p>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-teal-100 bg-teal-50 p-3 text-xs leading-5 text-teal-900">
        <strong>Что не входит в цифру, но влияет на рост со временем:</strong> готовность учиться и развиваться в профессии,
        и наличие готового контента (фото/видео) для дополнительных площадок вроде OnlyFans/Fansly. Эти факторы не дают мгновенного
        прироста дохода, но напрямую влияют на то, как быстро вы выйдете за пределы диапазона новичка.
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-400">
        Расчёт условный, основан на статистических тенденциях по нишам, а не на оценке личных качеств. Не учитывает расходы на оборудование,
        интернет и услуги оператора. Не является предложением заработка или гарантией дохода.
      </p>
    </section>
  );
}
