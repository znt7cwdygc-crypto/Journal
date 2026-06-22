type ImportanceLevel = "обязательно" | "желательно" | "не важно";

const importanceClasses: Record<ImportanceLevel, string> = {
  "обязательно": "border-red-200 bg-red-50 text-red-800",
  "желательно": "border-amber-200 bg-amber-50 text-amber-800",
  "не важно": "border-zinc-200 bg-zinc-100 text-zinc-700"
};

const importancePattern = /\s\((обязательно|желательно|не важно)\)$/;

function ImportanceBadge({ level }: { level: ImportanceLevel }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${importanceClasses[level]}`}>
      {level}
    </span>
  );
}

function BioLine({ line }: { line: string }) {
  const match = line.match(importancePattern);
  const cleanLine = match ? line.replace(importancePattern, "") : line;
  const level = match?.[1] as ImportanceLevel | undefined;
  const separatorIndex = cleanLine.indexOf(":");

  if (separatorIndex > 0) {
    const label = cleanLine.slice(0, separatorIndex);
    const value = cleanLine.slice(separatorIndex + 1).trim();

    return (
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 py-2 text-sm leading-6">
        <span className="font-semibold text-zinc-500">{label}</span>
        <span className="flex max-w-full flex-wrap items-center justify-end gap-2 text-right font-medium text-zinc-900 sm:max-w-[68%]">
          <span>{value || "не указано"}</span>
          {level && <ImportanceBadge level={level} />}
        </span>
      </div>
    );
  }

  if (cleanLine === cleanLine.toUpperCase() && cleanLine.length > 2) {
    return <h2 className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-hot first:mt-0">{cleanLine}</h2>;
  }

  return (
    <p className="text-base leading-8 text-zinc-800">
      {cleanLine}
      {level && <span className="ml-2"><ImportanceBadge level={level} /></span>}
    </p>
  );
}

export function ImportanceBio({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  return (
    <div className="mt-5 space-y-1">
      {lines.map((line, index) => (
        <BioLine key={`${line}-${index}`} line={line} />
      ))}
    </div>
  );
}
