---
title: Dashboard full control acceptance
date: 2026-07-26
---

# Dashboard full control — local acceptance

Scope: Dashboard P0+P1 (B+A product schema), **excluding ERP/CRM inbound APIs** (see [dashboard-erp-crm-handoff-2026-07-26.md](./dashboard-erp-crm-handoff-2026-07-26.md)).

## Schema

Migration `20260726054147_dashboard_product_fields`:

- `Product`: brand, MPN, subCategoryKey, unit, dimensions, finish/colors, packageQuantity, finishOptions, highlights, documents, supportLinks, recommendations
- `PlatformSku.manufacturerPartNumber`
- `SupportHandoff` model

## New dashboard capabilities

| Domain | Endpoints |
| --- | --- |
| Products | `GET /dashboard/products/:id`, specs CRUD, asset PATCH, SKU DELETE |
| Catalog config | `GET/PUT /dashboard/catalog`, `/storefront/config`, `/dealer-portal/settings` |
| Modules | `GET /dashboard/modules/readiness`, `GET/PUT /dashboard/modules/:moduleKey` |
| Dealers | `POST /dashboard/dealers`, location CRUD, service-area/erp-link DELETE |
| Ops | `GET /dashboard/inventory/snapshots`, order status/assign, email templates, support handoffs |
| Public | `GET /dealers/lookup`, `POST /support/handoffs` |

## Verification (passed locally)

| Command | Result |
| --- | --- |
| `pnpm db:migrate` + `db:seed` | OK |
| `pnpm typecheck` | OK |
| `pnpm test:api` | 49 passed |
| `pnpm api:smoke` | OK |

## Code layout

- [`apps/api/src/dashboard/catalog.ts`](../../apps/api/src/dashboard/catalog.ts)
- [`apps/api/src/dashboard/modules.ts`](../../apps/api/src/dashboard/modules.ts)
- [`apps/api/src/dashboard/dealers.ts`](../../apps/api/src/dashboard/dealers.ts)
- [`apps/api/src/dashboard/support.ts`](../../apps/api/src/dashboard/support.ts)
- [`apps/api/src/catalog/product-payload.ts`](../../apps/api/src/catalog/product-payload.ts)
