# VanStro P1a Implementation Handoff

Date: 2026-07-08

## Scope Started

P1a is now started with an API-first catalog and pricing slice:

* Catalog schema: categories, products, platform SKUs, product assets, specifications.
* Pricing schema: prices and active promotions.
* ERP mapping schema: platform SKU to ERP SKU key.
* Storefront read API for categories, products, product commerce, assets, active promotions, dealers and home BFF reads.
* Dashboard API for permissions, roles, users, products, categories, SKUs, assets, pricing, promotions, SKU mappings and basic dealer edits.
* Dashboard API is guarded by Bearer session auth plus `dashboard.access`.
* Admin login/session endpoints now exist at `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout` and `/auth/logout-all`.
* Minimal Dashboard shell now exists at `/dashboard` for API-first admin operations.
* `api:smoke` covers health, catalog reads, auth login, dashboard guard, dashboard user/role/permission writes, dashboard product/category/SKU/asset/price/promotion/ERP mapping writes, refresh rotation and logout revocation.
* Storefront server reads are API-first through `VANSTRO_WEBSITE_API_BASE_URL` or `NEXT_PUBLIC_API_BASE_URL`, with mock fallback for static export safety.

## Migration

Applied locally:

```bash
pnpm --filter @vanstro/db exec prisma migrate dev --name p0_hardening_p1a_catalog --schema prisma/schema.prisma
```

Created:

* `packages/db/prisma/migrations/20260708224802_p0_hardening_p1a_catalog/migration.sql`

## Seed

`pnpm db:seed` now creates:

* Three demo categories: kitchen cabinets, bathroom vanities, baseboards.
* Three demo products with SKUs, prices, assets, specifications and demo ERP mappings.
* One active demo promotion.

## Verified

* `pnpm db:seed`
* `pnpm run typecheck`
* `pnpm worker:once`
* `pnpm run build:pages`
* `VANSTRO_WEBSITE_API_BASE_URL='http://127.0.0.1:4000/api/v1' pnpm run build:pages`
* API readiness: `/health/ready`
* Public reads: `/api/v1/categories`, `/api/v1/products`, `/api/v1/products/base-cabinet-b33/commerce`, `/api/v1/promotions/active`, `/api/v1/home/products`
* Dashboard guard: `/api/v1/dashboard/products` returns `401` without Bearer auth and succeeds after seeded super admin login.
* `pnpm api:smoke`

## Completed After Initial P1a Slice

* Dashboard create/update contract smoke coverage for category, product, SKU, asset, price, promotion and SKU mapping.
* Dashboard user and role mutation endpoints: create/get/update/status, role assignment/removal, create/update role and replace role permissions.
* Frontend API contract changed from legacy `/admin/products` to `/dashboard/products`.
* Frontend promotion path aligned to `/promotions/active`.
* `src/lib/api/server.ts` now reads catalog/home/product/dealer data from Website API when configured and falls back to mock data otherwise.
* `/products` page now uses the server catalog helper instead of importing mock data directly.
* `/dashboard` client page now supports seeded admin sign-in, session restore/logout, dashboard counts, and read tabs for products, categories, pricing, promotions, users, roles and dealers.
* `/dashboard` includes quick-create forms for product, SKU, asset, category, price, promotion, admin user and role records against the real Website API.

## Second-Pass Audit Notes

* No runtime source references remain for legacy `/admin/products`; remaining hits are migration notes in docs only.
* No `x-vanstro-admin-user-id` fallback auth remains in source; Dashboard writes require Bearer auth plus `dashboard.access`.
* Dashboard token storage is intentionally simple for P1a (`sessionStorage`). Production hardening should revisit cookie/CSRF/session policy before exposing the admin surface broadly.

## 2026-07-09 Follow-up Audit Fixes

* Storefront API product image mapping now accepts any valid image URL from ProductAsset, including `/images/...`, CDN URLs and `/assets/...`; it no longer silently drops Dashboard-created image assets outside `/assets/`.
* Public catalog and commerce reads now filter PlatformSku records to `active` only, so archived/draft SKU records do not leak into storefront product payloads.
* `pnpm worker:once` now exits non-zero when the worker cannot read required job tables, preventing CI/deploy checks from treating a failed poll as successful.
* Current local DB-backed smoke rerun is blocked because Docker/Postgres is not running on this machine (`localhost:15432` unavailable). Non-DB checks passed: Prisma schema validate, `pnpm run typecheck`, `pnpm run build:pages`, `git diff --check`.

## Next P1a Work

* Add edit/status controls to the `/dashboard` shell after the write APIs settle.
* P1b submissions and review moderation moved to `docs/reports/p1b-implementation-handoff.md`.
* Add storefront client wiring for login form once P2 customer auth work starts.
