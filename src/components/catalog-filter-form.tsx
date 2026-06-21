"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

type CatalogFilter = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
};

export function CatalogFilterForm({
  basePath,
  filters
}: {
  basePath: string;
  filters: CatalogFilter[];
}) {
  const router = useRouter();
  const refs = useRef<Record<string, HTMLSelectElement | null>>({});
  const [pending, startTransition] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams();
    for (const filter of filters) {
      const value = refs.current[filter.name]?.value || "";
      if (value && value !== filter.defaultValue) params.set(filter.name, value);
    }
    const query = params.toString();
    startTransition(() => router.push(`${basePath}${query ? `?${query}` : ""}`));
  }

  return (
    <div className={`rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition ${pending ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filters.map((filter) => (
          <label key={filter.name} className="min-w-0">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">{filter.label}</span>
            <select
              ref={(element) => {
                refs.current[filter.name] = element;
              }}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-hot focus:bg-white"
              defaultValue={filter.value}
              onChange={applyFilters}
            >
              {filter.options.map((option) => (
                <option key={`${filter.name}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
