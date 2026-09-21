ALTER TABLE "crm_contacts"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "crm_contacts"
  ADD CONSTRAINT "crm_contacts_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "crm_contacts_ownerUserId_lastActivityAt_idx"
  ON "crm_contacts"("ownerUserId", "lastActivityAt" DESC);

CREATE TABLE "crm_tasks" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "assigneeUserId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "crm_tasks_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "crm_tasks_status_valid" CHECK ("status" IN ('open', 'completed', 'cancelled'))
);

CREATE INDEX "crm_tasks_contactId_status_dueAt_idx" ON "crm_tasks"("contactId", "status", "dueAt");
CREATE INDEX "crm_tasks_assigneeUserId_status_dueAt_idx" ON "crm_tasks"("assigneeUserId", "status", "dueAt");
