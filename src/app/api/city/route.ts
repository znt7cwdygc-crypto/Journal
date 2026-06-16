import { NextRequest, NextResponse } from "next/server";
import { CITY_COOKIE, CITY_OPTIONS } from "@/lib/city-constants";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const city = String(body?.city || "");
  const next = String(body?.next || "/articles");

  if (!CITY_OPTIONS.some((x) => x.value === city)) {
    return NextResponse.json({ ok: false, error: "invalid-city" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(CITY_COOKIE, city, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180
  });
  return res;
}
