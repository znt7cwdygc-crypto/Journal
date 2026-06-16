import { headers } from "next/headers";

export function resolveVisitorGeo(): string {
  const h = headers();
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country");

  if (city && country) return `${city.trim().toLowerCase()},${country.trim().toLowerCase()}`;
  if (city) return city.trim().toLowerCase();
  return "remote";
}
