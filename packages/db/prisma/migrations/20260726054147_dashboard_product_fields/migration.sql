-- CreateEnum
CREATE TYPE "SupportHandoffStatus" AS ENUM ('new', 'in_progress', 'resolved', 'closed');

-- AlterTable
ALTER TABLE "platform_skus" ADD COLUMN     "manufacturerPartNumber" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "certificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colorHex" TEXT,
ADD COLUMN     "colorName" TEXT,
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "documents" JSONB,
ADD COLUMN     "finish" TEXT,
ADD COLUMN     "finishOptions" JSONB,
ADD COLUMN     "manufacturerPartNumber" TEXT,
ADD COLUMN     "packageQuantity" JSONB,
ADD COLUMN     "productHighlights" JSONB,
ADD COLUMN     "recommendations" JSONB,
ADD COLUMN     "subCategoryKey" TEXT,
ADD COLUMN     "supportLinks" JSONB,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "support_handoffs" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "dealerId" TEXT,
    "cartId" TEXT,
    "transcript" JSONB NOT NULL,
    "status" "SupportHandoffStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_handoffs_status_createdAt_idx" ON "support_handoffs"("status", "createdAt");
