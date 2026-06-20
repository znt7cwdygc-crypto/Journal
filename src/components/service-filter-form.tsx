"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

export function ServiceFilterForm({
  cityValue,
  categoryValue,
  hasRemote,
  cities,
  categories
}: {
  cityValue: string;
  categoryValue: string;
  hasRemote: boolean;
  cities: string[];
  categories: string[];
}) {
  const router = useRouter();
  const cityRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const [pending, startTransition] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams();
    const city = cityRef.current?.value || "";
    const category = categoryRef.current?.value || "";
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    const query = params.toString();
    startTransition(() => router.push(`/services${query ? `?${query}` : ""}`));
  }

  return (
    <div className={`rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition ${pending ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Город</span>
          <select
            ref={cityRef}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
            defaultValue={cityValue}
            onChange={applyFilters}
          >
            <option value="">Все</option>
            {hasRemote && <option value="remote">Удаленно</option>}
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Категория</span>
          <select
            ref={categoryRef}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
            defaultValue={categoryValue}
            onChange={applyFilters}
          >
            <option value="">Все</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
