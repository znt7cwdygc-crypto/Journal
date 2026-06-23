import { NextResponse } from "next/server";
import { isHttpUrl } from "@/lib/ads";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const now = new Date();
  const ad = await prisma.advertisement.findFirst({
    where: {
      id: params.id,
      status: "ACTIVE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
      ]
    },
    select: { id: true, targetUrl: true }
  });

  if (!ad || !isHttpUrl(ad.targetUrl)) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  await prisma.advertisement.update({
    where: { id: ad.id },
    data: { clickCount: { increment: 1 } }
  });

  return NextResponse.redirect(ad.targetUrl);
}
