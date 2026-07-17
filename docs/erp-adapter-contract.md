# VanStro ERP Adapter Contract

Date: 2026-07-08
Status: P0 draft

This document captures the ERP integration assumptions required before P1a/P2 implementation. Storefront and Dashboard do not call ERP directly; Website API and worker processes call ERP through an adapter.

Related ERP-facing product selector note:

```text
docs/商品接口.md
```

## Stable Keys

| Topic | P0 assumption | Must confirm before |
| --- | --- | --- |
| SKU key | ERP provides a stable `sku_code` or equivalent external SKU key. | P1a completion |
| Platform mapping | `product_sku_erp_mappings` maps platform SKU to ERP SKU key. | P1a completion |
| Order idempotency | Platform order id is sent as `external_order_id`. | P2 start |
| ERP order id | ERP returns `erp_order_id` after accepted order creation. | P2 start |

## Required ERP Capabilities

| Capability | Required fields | Notes |
| --- | --- | --- |
| Inventory query | SKU key, location/dealer/warehouse id, available quantity, on-hand quantity, reserved quantity, updated time | Used by inventory snapshots and checkout validation. |
| Inventory reservation | SKU key, quantity, location/dealer/warehouse id, expiry time | Optional in P2 if ERP supports hold/release. |
| Order creation | `external_order_id`, customer/contact data, fulfillment method, order lines, price/tax/shipping snapshots | Must be idempotent. |
| Order status | ERP order id, status, status time, tracking number, carrier | Prefer webhook; query API is acceptable fallback. |
| Customer sync | Customer/contact fields, source, tags | Used after effective purchase or high-intent promotion. |

## Website API Capabilities For ERP

ERP also needs to call Website API for a platform-owned active product/SKU list when dealers create ERP-side purchase, receiving or inbound-stock orders.

This endpoint is provided by VanStro Website API because VanStro Dashboard owns storefront product master data, platform SKU data, website status, website pricing and platform-SKU-to-ERP-SKU mappings.

Initial proposed endpoint:

```text
GET /api/v1/erp/catalog/skus
```

Alternate namespace:

```text
GET /api/v1/integrations/erp/products
```

Expected behavior:

* Return active/listed platform products and SKUs only.
* Return SKU-level records by default.
* Include platform product/SKU ids, website SKU code, category, status, price, image, ERP system and ERP SKU key mapping.
* Support pagination.
* Support `updatedSince` for incremental sync if ERP needs caching.
* Use service-token authentication, not public storefront user auth.

This read API does not make ERP the storefront product source. ERP remains responsible for operational execution data: inventory, holds, order intake, fulfillment, shipment and status callbacks.

## Timeout And Retry Defaults

| Setting | P0 default |
| --- | --- |
| `erp_inventory_timeout_ms` | `2500` |
| `on_erp_timeout` | `retry_later` |
| Order create retry | Outbox retry with exponential backoff |
| Webhook retry | ERP should retry non-2xx responses; Website API stores all received events. |

## Webhook Security

P2 webhook endpoints must support:

* Shared-secret HMAC signature.
* Timestamp header.
* Replay window.
* Idempotency key or ERP event id.
* Raw payload retention in `erp_webhook_events`.

## Open Items For ERP Team

* Confirm stable SKU key: `sku_code`, `sku_id`, or another field.
* Provide test and production base URLs.
* Provide authentication method and token lifetime.
* Provide inventory, order-create, status and shipment payload examples.
* Provide error-code list and retry guidance.
* Confirm whether inventory reservation and release are supported.
