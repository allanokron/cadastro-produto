-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('SENIOR', 'TINY', 'STOCK', 'CLASSIFICATION', 'PRICE_COST');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('READY', 'REVIEW_REQUIRED', 'MISSING_REQUIRED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING_TINY', 'MATCHED_SKU', 'MATCHED_EAN', 'AMBIGUOUS', 'UNMATCHED', 'ID_MISSING', 'ID_DIVERGENT', 'CORRECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "spreadsheetUrl" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "keyPriority" JSONB NOT NULL DEFAULT '["sku","ean"]',
    "columnMapping" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "counts" JSONB,
    "errors" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "skuOriginal" TEXT,
    "skuKey" TEXT,
    "eanOriginal" TEXT,
    "eanKey" TEXT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSnapshot" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "skuKey" TEXT NOT NULL,
    "ean" TEXT,
    "eanKey" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "seniorData" JSONB NOT NULL,
    "tinyData" JSONB,
    "stock" DECIMAL(65,30),
    "classification" TEXT,
    "price" DECIMAL(65,30),
    "cost" DECIMAL(65,30),
    "comparisonStatus" "MatchStatus" NOT NULL,
    "productStatus" "ProductStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "physicalIssues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOverride" (
    "id" TEXT NOT NULL,
    "skuKey" TEXT NOT NULL,
    "weight" DECIMAL(65,30),
    "length" DECIMAL(65,30),
    "width" DECIMAL(65,30),
    "height" DECIMAL(65,30),
    "additionalInformation" TEXT,
    "approvedDescription" TEXT,
    "imageUrls" JSONB,
    "variationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TinyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileChecksum" TEXT,
    "columnMapping" JSONB NOT NULL,
    "headerRow" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TinyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariationGroup" (
    "id" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "attribute1" TEXT NOT NULL,
    "attribute2" TEXT,
    "exportConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariationItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "skuKey" TEXT NOT NULL,
    "value1" TEXT NOT NULL,
    "value2" TEXT,

    CONSTRAINT "VariationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "skuKey" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportItem" (
    "id" TEXT NOT NULL,
    "exportRunId" TEXT NOT NULL,
    "skuKey" TEXT NOT NULL,
    "exportedData" JSONB NOT NULL,

    CONSTRAINT "ExportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_type_key" ON "DataSource"("type");

-- CreateIndex
CREATE INDEX "SourceRecord_syncRunId_skuKey_idx" ON "SourceRecord"("syncRunId", "skuKey");

-- CreateIndex
CREATE INDEX "SourceRecord_syncRunId_eanKey_idx" ON "SourceRecord"("syncRunId", "eanKey");

-- CreateIndex
CREATE INDEX "ProductSnapshot_syncRunId_comparisonStatus_idx" ON "ProductSnapshot"("syncRunId", "comparisonStatus");

-- CreateIndex
CREATE INDEX "ProductSnapshot_skuKey_idx" ON "ProductSnapshot"("skuKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSnapshot_syncRunId_skuKey_key" ON "ProductSnapshot"("syncRunId", "skuKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOverride_skuKey_key" ON "ProductOverride"("skuKey");

-- CreateIndex
CREATE UNIQUE INDEX "VariationItem_groupId_skuKey_key" ON "VariationItem"("groupId", "skuKey");

-- CreateIndex
CREATE UNIQUE INDEX "VariationItem_groupId_value1_value2_key" ON "VariationItem"("groupId", "value1", "value2");

-- CreateIndex
CREATE INDEX "AiGeneration_skuKey_createdAt_idx" ON "AiGeneration"("skuKey", "createdAt");

-- CreateIndex
CREATE INDEX "ExportItem_exportRunId_idx" ON "ExportItem"("exportRunId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSnapshot" ADD CONSTRAINT "ProductSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationItem" ADD CONSTRAINT "VariationItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "VariationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRun" ADD CONSTRAINT "ExportRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportItem" ADD CONSTRAINT "ExportItem_exportRunId_fkey" FOREIGN KEY ("exportRunId") REFERENCES "ExportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
