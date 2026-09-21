---
title: Dashboard ERP/CRM handoff boundary
date: 2026-07-26
---

# Dashboard ERP/CRM handoff (for other agents)

This document defines what the Dashboard full-control workstream delivered versus what ERP/CRM integration agents should implement next.

## Ready for ERP/CRM agents (data + admin surfaces)

| Area | What exists | Paths / models |
| --- | --- | --- |
| Product catalog | Full CRUD, MPN, finish options, specs, SKU mappings | `Product`, `PlatformSku`, `ProductSkuErpMapping`, `/dashboard/products`, `/dashboard/sku-mappings` |
| Dealer links | ERP location links maintained in dashboard | `DealerErpLink`, `POST/DELETE /dashboard/dealers/:id/erp-links` |
| Sync queue | Outbound jobs + dashboard retry | `ErpSyncJob`, worker handlers `order_create`, `customer_sync`, `inventory_release` |
| Inbound webhook (orders) | Order status updates | `POST /integrations/erp/webhooks/order-status` |
| Service accounts | Machine auth for CLI/MCP | `ServiceAccount`, permissions `cli.access`, `mcp.access` |

## ERP agent — product module (implemented 2026-07-26)

See `docs/reports/erp-product-api-integration-2026-07-26.md`.

- `GET /integrations/erp/catalog/skus` — local catalog export for ERP
- `GET /integrations/erp/upstream/*` — proxy to vanstro.xin product APIs
- `GET /products/:identifier/erp-colors` — public color enrichment from ERP `colorList`
- `ProductSkuErpMapping.erpProductId` / `erpSkuId` + dashboard sku-mapping CRUD

## Catalog + inventory loop (implemented 2026-07-28)

| Area | What exists | Paths / models |
| --- | --- | --- |
| ERP → Dashboard catalog pull | Merge upstream `productList`/`skuList` into local products/SKU mappings without overwriting marketing fields | `POST /dashboard/catalog/sync-from-erp`, `apps/api/src/integrations/erp-catalog-sync/service.ts` |
| Dashboard inventory ops | Manual on-hand adjust; payment decrements `quantityOnHand` | `POST/PATCH /dashboard/inventory/snapshots`, `inventory.write` |
| Storefront catalog | `status=active` products served via `GET /products` | No separate cache layer |
| Order → ERP outbound | Worker `order_create` sends dealer ERP location, SKU mapping ids, inventory lines | `apps/worker/src/index.ts` |
| Inventory release queue | Expired reservations + cancelled orders enqueue `inventory_release` | `ErpSyncJob(type: inventory_release)` |

**Still deferred:** inbound ERP quantity webhooks (upstream product API has no `quantityOnHand`); promotion discount engine at checkout.

## ERP agent — still not implemented here

- `POST /integrations/erp/webhooks/customer-update`
- Inbound ERP inventory quantity sync → `InventorySnapshot` (await ERP inventory API)
- Webhook timestamp/replay hardening per `docs/erp-adapter-contract.md`

## CRM agent — Website CRM implemented (2026-07-28)

Website CRM is managed in Dashboard under `/dashboard?tab=crmContacts`:

- `GET /dashboard/crm/contacts` — list contacts with stage/search/pagination (`crm.read`)
- `GET /dashboard/crm/contacts/:id` — profile, events timeline, notes, order summary, read-only ERP links/sync jobs
- `PATCH /dashboard/crm/contacts/:id` — stage and profile fields (`crm.update`)
- `POST /dashboard/crm/contacts/:id/notes` — operator notes (`crm.update`)
- `POST /dashboard/crm/contacts/:id/promote-to-erp` — enqueue `customer_sync` (`crm.promote`)

Registration, cart, checkout, favorites, and paid orders dual-write into `crm_contacts` / `crm_contact_events` via `apps/api/src/crm/service.ts`.

**External ERP CRM is not managed in Dashboard.** Operators can only view sync status and manually promote contacts to the `customer_sync` queue. Worker pushes to ERP `POST /customers`.

## CRM agent — still not implemented here

- `POST /integrations/erp/webhooks/customer-update` inbound sync
- Deep ERP CRM field editing or configuration UI

## Dashboard completed in this workstream

- Product detail + specifications CRUD
- Catalog / storefront / dealer-portal module config (`SiteContentModule`)
- Module readiness + Pattern B adapter (`/dashboard/modules/*`)
- Dealer full CRUD + service-area delete + public `GET /dealers/lookup`
- Inventory snapshots dashboard read
- Order status patch + dealer assignment
- Email template CRUD + versions
- Support handoff public intake + dashboard queue

## Local verification

```bash
pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm test:api && pnpm api:smoke
```

No secrets are stored in this document.
