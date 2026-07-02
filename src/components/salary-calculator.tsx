"use client";

import { useMemo, useState } from "react";

type Experience = "novice" | "mid" | "pro";
type Format = "studio" | "home";

// Диапазон валового дохода за одну смену (USD), до вычета процента студии.
// Основано на реалистичных цифрах из гайда: новичок $500-1500/мес при 5 сменах в неделю.
const perSessionRange: Record<Experience, [number, number]> = {
  novice: [30, 90],
  mid: [80, 220],
  pro: [200, 600]
};

const experienceLabels: Record<Experience, string> = {
  novice: "Новичок (0-2 месяца)",
  mid: "Средний опыт (3-12 месяцев)",
  pro: "Опытная (1+ год)"
};

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString("ru-RU")}`;
}

export function SalaryCalculator() {
  const [experience, setExperience] = useState<Experience>("novice");
  const [format, setFormat] = useState<Format>("studio");
  const [shiftsPerWeek, setShiftsPerWeek] = useState(5);
  const [studioPercent, setStudioPercent] = useState(50);

  const result = useMemo(() => {
    const [min, max] = perSessionRange[experience];
    const weeksPerMonth = 4.3;
    const grossMin = min * shiftsPerWeek * weeksPerMonth;
    const grossMax = max * shiftsPerWeek * weeksPerMonth;

    if (format === "studio") {
      const keep = 1 - studioPercent / 100;
      return {
        grossMin,
        grossMax,
        netMin: grossMin * keep,
        netMax: grossMax * keep
      };
    }

    return { grossMin, grossMax, netMin: grossMin, netMax: grossMax };
  }, [experience, format, shiftsPerWeek, studioPercent]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Калькулятор дохода вебкам-модели</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Оценка на основе публичных данных индустрии. Это не гарантия дохода — реальные цифры зависят от площадки, аудитории и регулярности.
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

      <p className="mt-3 text-xs leading-5 text-zinc-400">
        Расчёт условный и не учитывает расходы на оборудование, интернет и услуги оператора. Не является предложением заработка или гарантией дохода.
      </p>
    </section>
  );
}
