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

## ERP agent — still not implemented here

- `POST /integrations/erp/webhooks/shipment`
- `POST /integrations/erp/webhooks/customer-update`
- Inbound inventory sync → `InventorySnapshot`
- Webhook timestamp/replay hardening per `docs/erp-adapter-contract.md`

## CRM agent — not implemented here

- `GET /dashboard/customers` (website `kind=customer` users)
- `GET /dashboard/customers/:id` (profile, orders, consent)
- `POST /dashboard/customers/:id/promote-to-erp` → enqueue `customer_sync`
- Permissions already seeded: `crm.read`, `crm.update`, `crm.promote`

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
