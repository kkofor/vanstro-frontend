-- V11-R1 ERP readiness (Wave 3a): price source ownership + single-active enforcement.
-- Unique forward migration 83. Do not edit migrations 1-82.
--
-- Design note (§11.7 of tasks/contracts/v11-r1-erp-readiness.v1):
--
-- 1. Model gap
--    Contract §4 (price owner): amountCents (base price) is ERP-owned while
--    compareAtCents + status are VanStro-owned. Existing `prices` has no way to
--    record who wrote a row or how fresh the ERP value is, so ERP writes cannot
--    be distinguished from VanStro writes and non-owner fields could be clobbered.
--    Gap closed by three additive columns:
--      source          TEXT NOT NULL DEFAULT 'vanstro'  (domain vanstro|erp)
--      externalVersion INTEGER NULL                     (ERP-side version for CAS)
--      sourceUpdatedAt TIMESTAMPTZ(3) NULL              (ERP last-write timestamp)
--    Existing CHECKs (prices_amount_nonnegative, prices_compare_at_valid,
--    prices_effective_window_valid from migration 20260730230000_financial_invariants)
--    are preserved untouched.
--
-- 2. New schema
--    source          TEXT NOT NULL DEFAULT 'vanstro' -- stays TEXT per contract;
--                    a CHECK constrains the vanstro|erp domain (Prisma does not
--                    track CHECKs, so this is invisible to schema drift).
--    externalVersion INTEGER NULL
--    sourceUpdatedAt TIMESTAMPTZ(3) NULL
--
-- 3. Unique constraints (single-active semantics)
--    Contract: at most one active price per (skuId, currency) at any moment;
--    active = status='active' AND effectiveFrom<=now<effectiveUntil (NULL unbounded).
--    SQL-enforceable form: partial UNIQUE INDEX
--      CREATE UNIQUE INDEX prices_single_active_sku_currency_idx
--        ON prices (skuId, currency) WHERE status = 'active';
--    The predicate is evaluated only at write time (PostgreSQL never re-evaluates
--    index predicates as time advances), so a now()-dependent predicate could NOT
--    stop two rows from both becoming active later. The status-only predicate is
--    the only robust form.
--    Residual (documented): the index is deliberately STRICTER than the temporal
--    definition — it forbids any two status='active' rows for one (skuId,currency),
--    including non-overlapping future-dated windows. Scheduled price changes must
--    archive the current active row (status='archived') or update it in place
--    before inserting a new active row. Rows whose window expired but still have
--    status='active' remain covered by the index; temporal filtering stays in app
--    queries (catalog + cart/checkout share the same active-price predicate).
--
-- 4. Existing-data backfill / dedup (runs BEFORE the index)
--    Every (skuId, currency) group with multiple status='active' rows is reduced
--    to exactly one keeper — the newest by (effectiveFrom DESC NULLS LAST,
--    updatedAt DESC, id DESC). All other rows are ARCHIVED (status='archived',
--    updatedAt=CURRENT_TIMESTAMP), never physically deleted (contract: additive
--    only, no physical delete). This also archives active rows with disjoint or
--    future-dated windows that the stricter index would reject. Groups with a
--    single active row are untouched. The keeper set is exactly one active row
--    per (skuId,currency), so index creation cannot fail on existing data.
--
-- 5. Duplicate/conflict handling
--    Post-migration, a second active insert for the same (skuId,currency) fails
--    with unique_violation on prices_single_active_sku_currency_idx; ingest must
--    archive/update the current active row first (same rule as pre-existing
--    product_sku_erp_mappings upserts). ERP writes set source='erp' +
--    externalVersion and never null out VanStro-owned fields; the CHECK keeps
--    source within {vanstro,erp}.
--
-- 6. Forward-fix / rollback
--    Additive forward migration. Back-out: DROP INDEX
--    prices_single_active_sku_currency_idx, then DROP COLUMN source,
--    externalVersion, sourceUpdatedAt (CHECK drops with the column). Archived
--    rows keep their data — status flips are data-preserving, and a re-run of a
--    corrected ingest can re-activate rows; no physical data was deleted.
--
-- Single transaction; forward-append from migration 82.

BEGIN;

-- 1. EXPAND: additive columns (no existing column/constraint altered).
ALTER TABLE "prices" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'vanstro';
ALTER TABLE "prices" ADD COLUMN "externalVersion" INTEGER;
ALTER TABLE "prices" ADD COLUMN "sourceUpdatedAt" TIMESTAMPTZ(3);

-- source domain enforcement (TEXT column per contract; CHECK constrains the
-- vanstro|erp enum domain; Prisma does not track CHECKs -> no drift).
ALTER TABLE "prices" ADD CONSTRAINT "prices_source_check" CHECK ("source" IN ('vanstro', 'erp'));

-- 2. BACKFILL/dedup: archive every duplicate-active row; keep one newest
--    keeper per (skuId, currency). Runs before the index so creation cannot
--    fail on existing data.
WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "skuId", "currency"
            ORDER BY "effectiveFrom" DESC NULLS LAST, "updatedAt" DESC, "id" DESC
        ) AS rn
    FROM "prices"
    WHERE "status" = 'active'
)
UPDATE "prices" p
SET "status" = 'archived', "updatedAt" = CURRENT_TIMESTAMP
FROM ranked r
WHERE p."id" = r."id" AND r.rn > 1;

-- 3. CONTRACT: partial unique index enforcing at most one active row per
--    (skuId, currency).
CREATE UNIQUE INDEX "prices_single_active_sku_currency_idx"
    ON "prices" ("skuId", "currency")
    WHERE "status" = 'active';

COMMIT;
