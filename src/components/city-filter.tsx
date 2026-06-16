import Link from "next/link";
import { CITY_OPTIONS, type CityValue } from "@/lib/city-constants";

type CityFilterProps = {
  basePath: string;
  active?: CityValue | "";
  sort?: string;
};

export function CityFilter({ basePath, active = "", sort }: CityFilterProps) {
  function href(city?: CityValue) {
    const params = new URLSearchParams();
    if (sort && sort !== "new") params.set("sort", sort);
    if (city) params.set("city", city);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
      <span className="text-zinc-500">Город:</span>
      <Link
        href={href()}
        className={`rounded px-2 py-1 ${!active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
      >
        Все
      </Link>
      {CITY_OPTIONS.map((city) => (
        <Link
          key={city.value}
          href={href(city.value)}
          className={`rounded px-2 py-1 ${active === city.value ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
        >
          {city.label}
        </Link>
      ))}
    </div>
  );
}
