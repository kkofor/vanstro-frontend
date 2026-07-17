-- AlterTable
ALTER TABLE "inventory_reservations" ADD COLUMN "ownerToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "erp_webhook_events_erpSystem_eventType_externalId_key" ON "erp_webhook_events"("erpSystem", "eventType", "externalId");
