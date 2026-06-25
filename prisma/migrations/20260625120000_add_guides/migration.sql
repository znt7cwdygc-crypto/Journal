CREATE TABLE "Guide" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "audience" TEXT,
    "keywords" TEXT[],
    "sections" TEXT NOT NULL,
    "faq" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "related" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Guide_slug_key" ON "Guide"("slug");
CREATE UNIQUE INDEX "Guide_path_key" ON "Guide"("path");
CREATE INDEX "Guide_kind_isPublished_idx" ON "Guide"("kind", "isPublished");
CREATE INDEX "Guide_isPublished_showOnHome_idx" ON "Guide"("isPublished", "showOnHome");
