import Link from "next/link";

type SortOption = { key: string; label: string };

export function ContentSort({
  basePath,
  active,
  options,
  params = {}
}: {
  basePath: string;
  active: string;
  options: SortOption[];
  params?: Record<string, string | undefined>;
}) {
  function href(sort: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    query.set("sort", sort);
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
      <span className="text-zinc-500">Сортировка:</span>
      {options.map((opt) => (
        <Link
          key={opt.key}
          href={href(opt.key)}
          className={`rounded px-2 py-1 ${active === opt.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
