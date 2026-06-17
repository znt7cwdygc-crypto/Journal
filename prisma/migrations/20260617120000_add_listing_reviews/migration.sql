CREATE TABLE "ListingReview" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parentId" TEXT,
  "rating" INTEGER,
  "body" TEXT NOT NULL,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hiddenReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ListingReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingReview_listingId_createdAt_idx" ON "ListingReview"("listingId", "createdAt");
CREATE INDEX "ListingReview_parentId_createdAt_idx" ON "ListingReview"("parentId", "createdAt");

ALTER TABLE "ListingReview"
  ADD CONSTRAINT "ListingReview_rating_check"
  CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));

ALTER TABLE "ListingReview"
  ADD CONSTRAINT "ListingReview_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingReview"
  ADD CONSTRAINT "ListingReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingReview"
  ADD CONSTRAINT "ListingReview_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "ListingReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
