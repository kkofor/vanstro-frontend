-- CreateEnum
CREATE TYPE "ContactLeadStatus" AS ENUM ('new', 'routed', 'closed', 'spam');

-- CreateEnum
CREATE TYPE "DealerApplicationStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "ProductReviewStatus" AS ENUM ('pending', 'published', 'rejected', 'archived');

-- CreateTable
CREATE TABLE "contact_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "topic" TEXT NOT NULL,
    "city" TEXT,
    "preferredDealer" TEXT,
    "orderNumber" TEXT,
    "message" TEXT NOT NULL,
    "sourcePath" TEXT,
    "status" "ContactLeadStatus" NOT NULL DEFAULT 'new',
    "assignedToUserId" TEXT,
    "assignedDealerId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_lead_notes" (
    "id" TEXT NOT NULL,
    "contactLeadId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_applications" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "businessType" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "serviceArea" TEXT,
    "productFocus" TEXT,
    "capabilities" JSONB,
    "message" TEXT,
    "source" TEXT,
    "applicationAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "status" "DealerApplicationStatus" NOT NULL DEFAULT 'submitted',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_application_notes" (
    "id" TEXT NOT NULL,
    "dealerApplicationId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_application_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topics" JSONB,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductReviewStatus" NOT NULL DEFAULT 'pending',
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_notes" (
    "id" TEXT NOT NULL,
    "productReviewId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_leads_status_createdAt_idx" ON "contact_leads"("status", "createdAt");

-- CreateIndex
CREATE INDEX "dealer_applications_status_createdAt_idx" ON "dealer_applications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "product_reviews_productId_status_createdAt_idx" ON "product_reviews"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "product_reviews_status_createdAt_idx" ON "product_reviews"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_lead_notes" ADD CONSTRAINT "contact_lead_notes_contactLeadId_fkey" FOREIGN KEY ("contactLeadId") REFERENCES "contact_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_application_notes" ADD CONSTRAINT "dealer_application_notes_dealerApplicationId_fkey" FOREIGN KEY ("dealerApplicationId") REFERENCES "dealer_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_notes" ADD CONSTRAINT "product_review_notes_productReviewId_fkey" FOREIGN KEY ("productReviewId") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
