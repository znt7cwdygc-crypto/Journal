-- Add named-author fields to Guide, for schema.org Person authorship instead of Organization
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "authorTitle" TEXT;
