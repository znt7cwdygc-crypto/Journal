import { ReactNode } from "react";

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-zinc-900">{children}</h2>
      {right}
    </div>
  );
}

const accentMap: Record<string, string> = {
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  purple: "border-l-violet-500",
  red: "border-l-red-500",
  zinc: "border-l-zinc-400",
};

export function StatCard({
  icon,
  value,
  label,
  sub,
  accent = "zinc",
}: {
  icon: string;
  value: number | string;
  label: string;
  sub?: string;
  accent?: keyof typeof accentMap;
}) {
  return (
    <div className={`rounded-xl border border-zinc-200 border-l-4 ${accentMap[accent]} bg-white p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{String(value)}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

const badgeMap: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-zinc-100 text-zinc-600",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof badgeMap; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badgeMap[color]}`}>
      {children}
    </span>
  );
}

export function statusColor(status: string): keyof typeof badgeMap {
  switch (status) {
    case "PUBLISHED":
    case "APPROVED":
    case "ACTIVE":
    case "RESOLVED":
    case "ACCEPTED":
      return "green";
    case "DRAFT":
    case "PAUSED":
    case "PENDING":
    case "EXPIRED":
      return "gray";
    case "PENDING_REVIEW":
      return "amber";
    case "ARCHIVED":
    case "REJECTED":
    case "HIDDEN":
    case "DECLINED":
      return "red";
    default:
      return "blue";
  }
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {head}
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}
