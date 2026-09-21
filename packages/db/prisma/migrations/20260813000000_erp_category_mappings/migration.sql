-- V11-R1 ERP readiness (Wave 3a): Category external identity mapping.
-- Unique forward migration 82. Do not edit migrations 1-81.
--
-- Design note (§11.7 of tasks/contracts/v11-r1-erp-readiness.v1):
--
-- 1. Model gap
--    The frozen contract §1 (stable IDs) defines Category as
--      VanStro internal: Category.id (UUID) + slug (unique)
--      ERP external:     erpSystem + erpCategoryKey + erpCategoryId
--    and assigns it to a NEW table `erp_category_mappings`. No existing table
--    stores category↔ERP identity; the pre-existing `product_sku_erp_mappings`
--    covers only SKU-level mapping, so a dedicated table is required. Hard
--    constraints: no matching by name/color text/display order/slug; every
--    unmapped category fails per-item (ERP_MAPPING_INCOMPLETE); repeat syncs
--    must not produce duplicate rows.
--
-- 2. New schema
--    erp_category_mappings:
--      id               UUID NOT NULL (client-generated uuid, matches erp_webhooks)
--      erpSystem        TEXT NOT NULL
--      erpCategoryKey   TEXT NOT NULL
--      erpCategoryId    INTEGER NULL   (external numeric id may be absent pre-integration)
--      categoryId       TEXT NOT NULL  (uuid-valued; TEXT to match categories.id,
--                                       the FK reference type -- see note 3)
--      createdAt        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
--      updatedAt        TIMESTAMPTZ(3) NOT NULL
--
-- 3. Unique constraints / FK
--      UNIQUE(erpSystem, erpCategoryKey)  -> one ERP category key per system
--      UNIQUE(categoryId, erpSystem)      -> one internal category per system
--      FK categoryId -> categories(id) ON DELETE RESTRICT: an ERP-mapped category
--      must never be silently orphaned; deleting one is a caller error. The
--      contract says "uuid" for the column type; categories.id is TEXT (uuid
--      text, Prisma String @id @default(uuid())), and PostgreSQL requires the
--      FK column type to equal the referenced type, so the column is TEXT
--      carrying uuid text. UUID-typed would make the FK un-creatable.
--
-- 4. Existing-data backfill
--    None required: this table is new; the app canonical ingest populates it.
--
-- 5. Duplicate/conflict handling
--    Both unique indexes reject duplicate (system,key) and (category,system)
--    rows at write time; upsert-on-conflict is the ingest contract's job.
--
-- 6. Forward-fix / rollback
--    Additive only: nothing existing is altered. Rollback = drop this table;
--    no data loss beyond the mapping rows themselves.
--
-- Single transaction; forward-append from migration 81 (20260810110000_s12_erp_webhooks).

BEGIN;

-- CreateTable
CREATE TABLE "erp_category_mappings" (
    "id" UUID NOT NULL,
    "erpSystem" TEXT NOT NULL,
    "erpCategoryKey" TEXT NOT NULL,
    "erpCategoryId" INTEGER,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "erp_category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "erp_category_mappings_erpSystem_erpCategoryKey_key" ON "erp_category_mappings"("erpSystem", "erpCategoryKey");

-- CreateIndex
CREATE UNIQUE INDEX "erp_category_mappings_categoryId_erpSystem_key" ON "erp_category_mappings"("categoryId", "erpSystem");

-- AddForeignKey
ALTER TABLE "erp_category_mappings" ADD CONSTRAINT "erp_category_mappings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
