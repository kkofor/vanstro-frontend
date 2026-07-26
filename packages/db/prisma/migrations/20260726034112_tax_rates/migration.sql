-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "gstRate" DECIMAL(6,5) NOT NULL DEFAULT 0,
    "pstRate" DECIMAL(6,5) NOT NULL DEFAULT 0,
    "hstRate" DECIMAL(6,5) NOT NULL DEFAULT 0,
    "combinedRate" DECIMAL(6,5) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_province_key" ON "tax_rates"("province");
