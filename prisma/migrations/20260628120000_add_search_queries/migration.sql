CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchQuery_query_createdAt_idx" ON "SearchQuery"("query", "createdAt");
CREATE INDEX "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");
