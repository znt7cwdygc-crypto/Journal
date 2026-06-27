-- CreateTable
CREATE TABLE "UsefulLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UsefulLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsefulLink_isPublished_sortOrder_idx" ON "UsefulLink"("isPublished", "sortOrder");
