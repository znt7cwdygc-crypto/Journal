"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

type SortOption = { key: string; label: string };

export function ProductFilterForm({
  cityValue,
  categoryValue,
  sortValue,
  cities,
  categories,
  sortOptions
}: {
  cityValue: string;
  categoryValue: string;
  sortValue: string;
  cities: string[];
  categories: string[];
  sortOptions: SortOption[];
}) {
  const router = useRouter();
  const cityRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const sortRef = useRef<HTMLSelectElement>(null);
  const [pending, startTransition] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams();
    const city = cityRef.current?.value || "";
    const category = categoryRef.current?.value || "";
    const sort = sortRef.current?.value || "new";
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    if (sort !== "new") params.set("sort", sort);
    const query = params.toString();
    startTransition(() => router.push(`/products${query ? `?${query}` : ""}`));
  }

  return (
    <div className={`rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition ${pending ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="min-w-0">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Город</span>
          <select
            ref={cityRef}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
            defaultValue={cityValue}
            onChange={applyFilters}
          >
            <option value="">Все</option>
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
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
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
        <label className="col-span-2 min-w-0 sm:col-span-1">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Сортировка</span>
          <select
            ref={sortRef}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
            defaultValue={sortValue}
            onChange={applyFilters}
          >
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
