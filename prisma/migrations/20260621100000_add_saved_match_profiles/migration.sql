ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'RESUME';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'MATCH_PROFILE';

CREATE TABLE "SavedResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedResume_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedResume_userId_resumeId_key" ON "SavedResume"("userId", "resumeId");
CREATE INDEX "SavedResume_resumeId_idx" ON "SavedResume"("resumeId");

ALTER TABLE "SavedResume" ADD CONSTRAINT "SavedResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedResume" ADD CONSTRAINT "SavedResume_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavedMatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMatchProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedMatchProfile_userId_matchProfileId_key" ON "SavedMatchProfile"("userId", "matchProfileId");
CREATE INDEX "SavedMatchProfile_matchProfileId_idx" ON "SavedMatchProfile"("matchProfileId");

ALTER TABLE "SavedMatchProfile" ADD CONSTRAINT "SavedMatchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedMatchProfile" ADD CONSTRAINT "SavedMatchProfile_matchProfileId_fkey" FOREIGN KEY ("matchProfileId") REFERENCES "MatchProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
