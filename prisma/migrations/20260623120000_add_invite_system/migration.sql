-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BalanceTxType" AS ENUM ('TOP_UP', 'HOLD', 'CHARGE', 'REFUND');

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'INVITE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "violationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "quizAnswers" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "offeredPercent" INTEGER,
    "amountUsd" INTEGER NOT NULL DEFAULT 15,
    "holdTxId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableUsd" INTEGER NOT NULL DEFAULT 0,
    "holdUsd" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BalanceTxType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "inviteId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invite_resumeId_studioId_idx" ON "Invite"("resumeId", "studioId");
CREATE INDEX "Invite_modelId_status_idx" ON "Invite"("modelId", "status");
CREATE INDEX "Invite_status_expiresAt_idx" ON "Invite"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioBalance_userId_key" ON "StudioBalance"("userId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_userId_createdAt_idx" ON "BalanceTransaction"("userId", "createdAt");
CREATE INDEX "BalanceTransaction_inviteId_idx" ON "BalanceTransaction"("inviteId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioBalance" ADD CONSTRAINT "StudioBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
