import { NextResponse } from "next/server";

const INDEXNOW_KEY = "wejournal-indexnow-key-2026";

export async function GET() {
  return new NextResponse(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain" } });
}
