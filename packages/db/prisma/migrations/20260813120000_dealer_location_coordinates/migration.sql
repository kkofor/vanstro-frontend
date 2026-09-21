-- V11-R1 Dealer lifecycle: auditable map coordinates on dealer locations.
-- Unique forward migration 84. Do not edit migrations 1-83.
--
-- Design note (Dealer lifecycle work item):
--
-- 1. Gap
--    The storefront Dealer Map and the PDP distance estimate previously ran
--    on hardcoded coordinates (src/lib/data/dealer-map-locations.ts). The
--    dealer_locations table had no coordinate columns, so the public /dealers
--    API could not serve map markers from production data. The Dashboard
--    location form must capture "map coordinates or formal auditable
--    geocoding"; without an external geocoder the auditable primitive is a
--    latitude/longitude pair entered by an operator and preserved verbatim.
--
-- 2. New schema (additive, nullable)
--    latitude  DOUBLE PRECISION NULL
--    longitude DOUBLE PRECISION NULL
--    Both nullable so existing rows are untouched; validation lives in the
--    Dashboard write routes (range checks: latitude in [-90, 90], longitude
--    in [-180, 180]) and the public read path only emits both values when
--    present.
--
-- 3. Rollback
--    Back-out is additive-safe: DROP COLUMN latitude, longitude. No data is
--    rewritten; a re-run of the forward migration restores the columns
--    (values are lost on rollback by design — coordinates are re-entered via
--    the Dashboard form).
--
-- Single transaction; forward-append from migration 83.

BEGIN;

ALTER TABLE "dealer_locations" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "dealer_locations" ADD COLUMN "longitude" DOUBLE PRECISION;

COMMIT;
