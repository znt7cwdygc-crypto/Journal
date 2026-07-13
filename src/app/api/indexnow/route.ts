import { NextResponse } from "next/server";
import { INDEXNOW_KEY } from "@/lib/indexnow";

export async function GET() {
  return new NextResponse(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain" } });
}
