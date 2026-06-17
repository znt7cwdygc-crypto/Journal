ALTER TABLE "Resume" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Resume"
SET "expiresAt" = NOW() + INTERVAL '7 days'
WHERE "expiresAt" IS NULL;

CREATE INDEX "Resume_isPublic_hiddenByInactivity_expiresAt_idx"
  ON "Resume"("isPublic", "hiddenByInactivity", "expiresAt");
