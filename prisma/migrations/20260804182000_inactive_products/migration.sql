ALTER TABLE "ProductOverride"
ADD COLUMN IF NOT EXISTS "excludedFromAnalysis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "exclusionReason" TEXT,
ADD COLUMN IF NOT EXISTS "excludedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ProductOverride_excludedFromAnalysis_idx" ON "ProductOverride"("excludedFromAnalysis");
