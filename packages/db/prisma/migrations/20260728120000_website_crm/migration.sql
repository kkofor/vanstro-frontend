-- CreateEnum
CREATE TYPE "CrmContactStage" AS ENUM ('registered', 'engaged', 'checkout_started', 'customer', 'high_intent', 'archived');

-- CreateEnum
CREATE TYPE "CrmContactSource" AS ENUM ('registration', 'contact_form', 'guest_checkout');

-- CreateEnum
CREATE TYPE "CrmErpSyncStatus" AS ENUM ('none', 'queued', 'synced', 'failed');

-- CreateEnum
CREATE TYPE "CrmContactEventType" AS ENUM ('registered', 'login', 'cart_add', 'checkout_started', 'order_paid', 'favorite_add', 'note', 'stage_change', 'erp_promoted');

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "stage" "CrmContactStage" NOT NULL DEFAULT 'registered',
    "source" "CrmContactSource" NOT NULL,
    "erpSyncStatus" "CrmErpSyncStatus" NOT NULL DEFAULT 'none',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_events" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "CrmContactEventType" NOT NULL,
    "payload" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_contact_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_notes" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_contact_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_contacts_userId_key" ON "crm_contacts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contacts_email_key" ON "crm_contacts"("email");

-- CreateIndex
CREATE INDEX "crm_contacts_stage_lastActivityAt_idx" ON "crm_contacts"("stage", "lastActivityAt");

-- CreateIndex
CREATE INDEX "crm_contact_events_contactId_createdAt_idx" ON "crm_contact_events"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "crm_contact_events_contactId_type_createdAt_idx" ON "crm_contact_events"("contactId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "crm_contact_notes_contactId_createdAt_idx" ON "crm_contact_notes"("contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_events" ADD CONSTRAINT "crm_contact_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_notes" ADD CONSTRAINT "crm_contact_notes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
