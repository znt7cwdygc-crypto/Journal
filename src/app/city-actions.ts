"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CITY_COOKIE, CITY_OPTIONS } from "@/lib/city-constants";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function chooseCityAction(formData: FormData) {
  const city = String(formData.get("city") ?? "");
  const next = String(formData.get("next") ?? "/articles");

  if (!CITY_OPTIONS.some((x) => x.value === city)) {
    throw new Error("Некорректный город");
  }

  cookies().set(CITY_COOKIE, city, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });

  redirect(safeInternalPath(next));
}
