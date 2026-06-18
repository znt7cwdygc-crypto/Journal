-- CreateTable
CREATE TABLE "MatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seekerRole" TEXT NOT NULL,
    "lookingFor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT,
    "timezone" TEXT,
    "experience" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "operatorPercent" TEXT,
    "currentCheck" TEXT,
    "niche" TEXT,
    "workFormat" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "hiddenReason" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchProfile_userId_key" ON "MatchProfile"("userId");

-- CreateIndex
CREATE INDEX "MatchProfile_status_updatedAt_idx" ON "MatchProfile"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "MatchProfile_seekerRole_lookingFor_status_idx" ON "MatchProfile"("seekerRole", "lookingFor", "status");

-- CreateIndex
CREATE INDEX "MatchProfile_city_status_idx" ON "MatchProfile"("city", "status");

-- AddForeignKey
ALTER TABLE "MatchProfile" ADD CONSTRAINT "MatchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
