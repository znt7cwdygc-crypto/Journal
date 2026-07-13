"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ChipGroup = {
  type: "chips";
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

type SwitchGroup = {
  type: "switch";
  name: string;
  label: string;
  value: boolean;
};

type RangeGroup = {
  type: "range";
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
};

export type DirectoryFilterGroup = ChipGroup | SwitchGroup | RangeGroup;

export function DirectoryFilterSidebar({ basePath, groups }: { basePath: string; groups: DirectoryFilterGroup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const group of groups) {
      if (group.type === "chips" && group.value) initial[group.name] = group.value;
      if (group.type === "switch" && group.value) initial[group.name] = "1";
      if (group.type === "range" && group.value) initial[group.name] = String(group.value);
    }
    return initial;
  });

  function commit(next: Record<string, string>) {
    setParams(next);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
    }
    const queryString = query.toString();
    startTransition(() => router.push(`${basePath}${queryString ? `?${queryString}` : ""}`));
  }

  function setChip(name: string, value: string) {
    commit({ ...params, [name]: value });
  }

  function toggleSwitch(name: string) {
    commit({ ...params, [name]: params[name] ? "" : "1" });
  }

  function setRange(name: string, value: string) {
    setParams((prev) => ({ ...prev, [name]: value }));
  }

  function commitRange(name: string, value: string) {
    commit({ ...params, [name]: value });
  }

  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 transition ${pending ? "opacity-70" : ""}`}>
      {groups.map((group) => (
        <div key={group.name} className="mb-4 last:mb-0">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-zinc-400">{group.label}</h3>

          {group.type === "chips" && (
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChip(group.name, opt.value)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                    (params[group.name] || "") === opt.value ? "bg-hot text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {group.type === "switch" && (
            <button type="button" onClick={() => toggleSwitch(group.name)} className="flex w-full items-center justify-between py-1 text-sm text-zinc-700">
              <span>{group.label}</span>
              <span className={`relative h-[18px] w-8 shrink-0 rounded-full border transition ${params[group.name] ? "border-accent bg-accent" : "border-zinc-200 bg-zinc-100"}`}>
                <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition ${params[group.name] ? "left-[15px]" : "left-0.5"}`} />
              </span>
            </button>
          )}

          {group.type === "range" && (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="range"
                min={group.min}
                max={group.max}
                step={group.step ?? 1}
                value={params[group.name] ? Number(params[group.name]) : group.min}
                className="flex-1 accent-hot"
                onChange={(e) => setRange(group.name, e.target.value)}
                onMouseUp={(e) => commitRange(group.name, (e.target as HTMLInputElement).value)}
                onTouchEnd={(e) => commitRange(group.name, (e.target as HTMLInputElement).value)}
                onKeyUp={(e) => commitRange(group.name, (e.target as HTMLInputElement).value)}
              />
              <span className="w-14 shrink-0 text-right font-bold text-zinc-900">
                {params[group.name] || group.min}
                {group.unit || ""}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
