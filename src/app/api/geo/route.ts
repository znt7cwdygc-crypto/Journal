import { NextResponse } from "next/server";
import { resolveVisitorGeo } from "@/lib/geo";

export async function GET() {
  return NextResponse.json({ geo: resolveVisitorGeo() });
}
