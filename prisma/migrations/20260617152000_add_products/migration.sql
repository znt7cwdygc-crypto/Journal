ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'PRODUCT';

CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'GOOD', 'USED', 'NEEDS_REPAIR');

CREATE TYPE "ProductDelivery" AS ENUM ('CITY_ONLY', 'DELIVERY', 'ANY');

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priceRub" INTEGER NOT NULL,
  "city" TEXT,
  "delivery" "ProductDelivery" NOT NULL DEFAULT 'ANY',
  "condition" "ProductCondition" NOT NULL DEFAULT 'GOOD',
  "description" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "imageUrl" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "hiddenReason" TEXT,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "responseCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedProduct" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");
CREATE INDEX "Product_category_status_idx" ON "Product"("category", "status");
CREATE INDEX "Product_createdById_createdAt_idx" ON "Product"("createdById", "createdAt");
CREATE UNIQUE INDEX "SavedProduct_userId_productId_key" ON "SavedProduct"("userId", "productId");
CREATE INDEX "SavedProduct_productId_idx" ON "SavedProduct"("productId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
