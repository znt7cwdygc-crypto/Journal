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

  const [expiredResumes, inactiveResumes, archivedListings, archivedProducts, archivedMatchProfiles] = await Promise.all([
    prisma.resume.updateMany({ where: { hiddenByInactivity: false, expiresAt: { lt: now } }, data: { hiddenByInactivity: true } }),
    prisma.resume.updateMany({ where: { hiddenByInactivity: false, lastVisitedAt: { lt: inactiveCutoff } }, data: { hiddenByInactivity: true } }),
    prisma.listing.updateMany({
      where: { status: "PUBLISHED", expiresAt: { lt: now } },
      data: { status: "ARCHIVED", hiddenReason: "Срок публикации истек" }
    }),
    prisma.product.updateMany({
      where: { status: "PUBLISHED", expiresAt: { lt: now } },
      data: { status: "ARCHIVED", hiddenReason: "Срок публикации истек" }
    }),
    prisma.matchProfile.updateMany({
      where: { status: "PUBLISHED", expiresAt: { lt: now } },
      data: { status: "ARCHIVED", hiddenReason: "Срок публикации истек" }
    })
  ]);

  // Expire pending invites past 72h and refund holds
  const expiredInvites = await prisma.invite.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true, studioId: true, amountUsd: true }
  });

  let expiredInviteCount = 0;
  for (const invite of expiredInvites) {
    const costCents = invite.amountUsd * 100;
    await prisma.$transaction([
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      }),
      prisma.balanceTransaction.create({
        data: {
          userId: invite.studioId,
          type: "REFUND",
          amountCents: costCents,
          inviteId: invite.id,
          note: `Refund for expired invite ${invite.id}`
        }
      }),
      prisma.studioBalance.update({
        where: { userId: invite.studioId },
        data: {
          holdUsd: { decrement: costCents },
          availableUsd: { increment: costCents }
        }
      })
    ]);
    expiredInviteCount++;
  }

  return NextResponse.json({
    ok: true,
    expiredResumes: expiredResumes.count,
    inactiveResumes: inactiveResumes.count,
    archivedListings: archivedListings.count,
    archivedProducts: archivedProducts.count,
    archivedMatchProfiles: archivedMatchProfiles.count,
    expiredInvites: expiredInviteCount
  });
}
