import type { Metadata } from "next";
import { CITY_OPTIONS } from "@/lib/city-constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Выбор города",
  robots: { index: false, follow: true }
};

export default function SelectCityPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = searchParams?.next || "/articles";

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Выберите ваш город</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Это нужно, чтобы показывать релевантные вакансии, услуги и резюме только для вашего города.
      </p>

      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          "use server";
          const city = String(formData.get("city") ?? "");
          const nextPath = String(formData.get("next") ?? "/articles");
          const { cookies } = await import("next/headers");
          const { redirect } = await import("next/navigation");
          const { CITY_COOKIE, CITY_OPTIONS } = await import("@/lib/city-constants");
          const { safeInternalPath } = await import("@/lib/safe-redirect");

          if (!CITY_OPTIONS.some((x) => x.value === city)) throw new Error("Некорректный город");

          cookies().set(CITY_COOKIE, city, {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 180
          });

          redirect(safeInternalPath(nextPath));
        }}
      >
        <input type="hidden" name="next" value={next} />
        <select name="city" className="w-full rounded border border-zinc-300 p-2" defaultValue="moscow" required>
          {CITY_OPTIONS.map((city) => (
            <option key={city.value} value={city.value}>{city.label}</option>
          ))}
        </select>
        <button className="rounded bg-zinc-900 px-4 py-2 text-white" type="submit">Продолжить</button>
      </form>
    </div>
  );
}
