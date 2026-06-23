-- CreateEnum
CREATE TYPE "AdvertisementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "status" "AdvertisementStatus" NOT NULL DEFAULT 'ACTIVE',
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advertisement_placement_status_idx" ON "Advertisement"("placement", "status");

-- CreateIndex
CREATE INDEX "Advertisement_expiresAt_idx" ON "Advertisement"("expiresAt");

-- CreateIndex
CREATE INDEX "Advertisement_createdById_createdAt_idx" ON "Advertisement"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
