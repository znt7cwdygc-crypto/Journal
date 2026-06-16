import { cookies } from "next/headers";
import { CITY_COOKIE, CITY_OPTIONS, type CityValue } from "@/lib/city-constants";

export { CITY_COOKIE, CITY_OPTIONS, type CityValue };

export function getSelectedCity(): CityValue | null {
  const c = cookies().get(CITY_COOKIE)?.value as CityValue | undefined;
  if (!c) return null;
  return CITY_OPTIONS.some((x) => x.value === c) ? c : null;
}

export function getCityMeta(value: CityValue | null) {
  if (!value) return null;
  return CITY_OPTIONS.find((x) => x.value === value) ?? null;
}
