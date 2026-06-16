import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const inactiveCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);

  const [hiddenResumes, archivedListings] = await Promise.all([
    prisma.resume.updateMany({ where: { lastVisitedAt: { lt: inactiveCutoff } }, data: { hiddenByInactivity: true } }),
    prisma.listing.updateMany({ where: { status: "PUBLISHED", expiresAt: { lt: now } }, data: { status: "ARCHIVED" } })
  ]);

  return NextResponse.json({ ok: true, hiddenResumes: hiddenResumes.count, archivedListings: archivedListings.count });
}
