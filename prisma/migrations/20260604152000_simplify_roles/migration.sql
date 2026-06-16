CREATE TYPE "UserRole_new" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AccountMode" AS ENUM ('CONSUMER', 'PROVIDER', 'BOTH');
CREATE TYPE "ProfileKind" AS ENUM ('MODEL', 'OPERATOR', 'STUDIO', 'AGENCY', 'EXPERT', 'COACH', 'LAWYER', 'OTHER');
CREATE TYPE "ArticleKind" AS ENUM ('BLOG', 'EXPERT', 'PROMO');

ALTER TABLE "User" ADD COLUMN "accountMode" "AccountMode" NOT NULL DEFAULT 'CONSUMER';
ALTER TABLE "User" ADD COLUMN "profileKind" "ProfileKind" NOT NULL DEFAULT 'MODEL';
ALTER TABLE "Article" ADD COLUMN "kind" "ArticleKind" NOT NULL DEFAULT 'BLOG';

UPDATE "User"
SET
  "accountMode" = CASE
    WHEN "role" IN ('STUDIO', 'EXPERT', 'OPERATOR', 'ADMINISTRATOR') THEN 'PROVIDER'::"AccountMode"
    ELSE 'CONSUMER'::"AccountMode"
  END,
  "profileKind" = CASE
    WHEN "role" = 'STUDIO' THEN 'STUDIO'::"ProfileKind"
    WHEN "role" = 'EXPERT' THEN 'EXPERT'::"ProfileKind"
    WHEN "role" = 'OPERATOR' THEN 'OPERATOR'::"ProfileKind"
    WHEN "role" = 'ADMINISTRATOR' THEN 'OTHER'::"ProfileKind"
    ELSE 'MODEL'::"ProfileKind"
  END;

UPDATE "Article" SET "kind" = 'EXPERT'::"ArticleKind";

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (CASE WHEN "role" = 'PLATFORM_ADMIN' THEN 'ADMIN' ELSE 'USER' END)::"UserRole_new";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "User" DROP COLUMN "intent";
DROP TYPE "UserIntent";
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
