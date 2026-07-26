---
title: ERP product module API integration
date: 2026-07-26
source: 产品模块API对接文档(3).md (ERP/CRM owners)
---

# ERP product module integration

This workstream connects the VanStro website API to the upstream ERP **product module** hosted at `http://www.vanstro.xin/api/Product`.

The upstream spec covers **products, SKUs, colors, and categories only**. CRM endpoints were not included in the handoff document.

## Upstream ERP endpoints (no auth)

| Endpoint | Purpose |
| --- | --- |
| `GET /productList` | Paginated or full product list (`has_color` flag) |
| `GET /skuList` | SKU list, optional `product_id` filter |
| `GET /colorList` | In-stock colors; optional `product_id`, `product_sku_id`, `dealer_id` |
| `GET /categoryList` | Category tree (`tree=1` optional) |

Envelope: `{ code: 1|0, msg, time, data }` — `code=1` success.

## Website API surfaces

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/integrations/erp/catalog/skus` | Service account (`cli.access` + `erp.catalog.read`) | Export active local SKUs + ERP mapping ids for ERP pull |
| `GET` | `/integrations/erp/upstream/products` | Service account | Proxy to ERP `productList` |
| `GET` | `/integrations/erp/upstream/skus` | Service account | Proxy to ERP `skuList` |
| `GET` | `/integrations/erp/upstream/colors` | Service account | Proxy to ERP `colorList` |
| `GET` | `/integrations/erp/upstream/categories` | Service account | Proxy to ERP `categoryList` |
| `GET` | `/products/:identifier/erp-colors` | Public | Resolve local SKU → ERP ids → `colorList` → `finishOptions` |

## Configuration

```bash
ERP_PRODUCT_API_BASE_URL="http://www.vanstro.xin/api/Product"
```

## Data model

`ProductSkuErpMapping` stores:

- `erpSkuKey` — legacy string key / SKU code
- `erpProductId` — upstream `product_id` for `colorList` / `skuList`
- `erpSkuId` — upstream SKU id (recommended with `dealer_id` for color stock)

`DealerErpLink.erpLocationId` must be a numeric ERP dealer id string (e.g. `"1"`) for `dealer_id` on `colorList`.

Dashboard maintainers can set mapping ids via `POST/PATCH /dashboard/sku-mappings`.

## Demo seed

- SKU `011090130` (`base-cabinet-b33`): `erpProductId=12`, `erpSkuId=1001`
- Winnipeg demo location: `DealerErpLink` → `vanstro-erp` / `erpLocationId=1`

## Error codes

| Code | When |
| --- | --- |
| `ERP_UNAVAILABLE` | Upstream HTTP failure or `code=0` |
| `ERP_MAPPING_INCOMPLETE` | Local SKU mapped but `erpProductId` missing |

## CRM (out of scope)

No CRM API document was provided. Existing `crm.*` permissions and `customer_sync` jobs remain for a future CRM agent.

## Verification

```bash
pnpm db:migrate && pnpm db:seed
pnpm typecheck && pnpm test:api
```

Example public call after seed:

```bash
curl "http://localhost:4000/api/v1/products/base-cabinet-b33/erp-colors?dealerLocationId=<location-uuid>"
```
