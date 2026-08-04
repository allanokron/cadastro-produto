CREATE TABLE "ImageCheck" (
    "skuKey" TEXT NOT NULL,
    "urlsSignature" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "availableUrl" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageCheck_pkey" PRIMARY KEY ("skuKey")
);

CREATE INDEX "ImageCheck_available_idx" ON "ImageCheck"("available");
