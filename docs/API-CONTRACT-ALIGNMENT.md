---
title: VanStro API Contract Alignment
version: 1.0
date: 2026-07-08
status: draft
summary: Canonical API paths and migration map between platform plan, frontend contracts, and dashboard modules.
---

# VanStro API Contract Alignment

This document is the **canonical source** for HTTP paths under `/api/v1`. When the platform plan (`vanstro-platform-architecture-plan.md`), handoff, or frontend contracts disagree, **this file wins** until explicitly revised.

Related:

- Platform plan v1.1 revisions: `docs/reports/vanstro-platform-architecture-plan-v1.1-revisions.md`
- Review summary: `docs/reports/vanstro-platform-architecture-review-summary.md`
- Frontend readiness: `docs/API-MODULE-READINESS-v1.md`
- Frontend types: `src/lib/api/api-contract.ts`, `src/lib/api/dashboard-contract.ts`

## Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `{NEXT_PUBLIC_API_BASE_URL}` → e.g. `https://api.vanstro.ca/api/v1` |
| Auth header | `Authorization: Bearer <access_token>` for customer/admin |
| Service accounts | `Authorization: Bearer <service_account_token>` for MCP/CLI |
| Response envelope | `{ data, meta? }` per `ApiResult<T>` in `api-contract.ts` |
| Product SEO reads | `/products/:slug` |
| Product writes & sub-resources | `/products/:productId/...` |
| Dashboard prefix | `/dashboard/...` (not `/admin/...`) |
| Account-scoped resources | `/account/...` for logged-in customer |
| Aggregated BFF reads | `/home/...` or `/storefront/...` — optional convenience; may compose atomic APIs |

## API layers

```text
Layer 1 · Atomic REST     /products, /cart, /checkout/session, /dashboard/products
Layer 2 · BFF aggregates  /home/products, /storefront/home
Layer 3 · Integrations    /integrations/erp/webhooks/*
Layer 4 · Machine         /mcp, CLI → Website API
```

Implement Layer 1 first. Layer 2 is recommended for static storefront performance but must not replace Layer 1 documentation.

---

## 1. Auth

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| POST | `/auth/customer/register` | P2 | `/auth/register` | **Migrate frontend** |
| POST | `/auth/login` | P2 | `/auth/login` | Keep |
| POST | `/auth/oauth/google` | P2.1+ | — | Plan only |
| POST | `/auth/oauth/apple` | P2.1+ | — | Plan only |
| GET | `/auth/oauth/google/callback` | P2.1+ | — | Plan only |
| GET | `/auth/oauth/apple/callback` | P2.1+ | — | Plan only |
| POST | `/auth/refresh` | P2 | — | Implement |
| POST | `/auth/logout` | P2 | — | Implement |
| POST | `/auth/logout-all` | P2 | — | Implement |
| GET | `/auth/me` | P2 | — | Implement |
| POST | `/auth/password/forgot` | P3 | — | Plan only |
| POST | `/auth/password/reset` | P3 | — | Plan only |

**Notes**

- Static login/register forms currently `action="/api/v1/auth/login"` — must switch to client-side `api-client` against canonical paths.
- Admin users are created via `POST /dashboard/users`, not public register.

---

## 2. Account (customer)

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| GET | `/account/me` | P2 | — | Implement |
| PATCH | `/account/me` | P2 | — | Implement |
| GET | `/account/addresses` | P2 | — | Implement |
| POST | `/account/addresses` | P2 | — | Implement |
| PATCH | `/account/addresses/:id` | P2 | — | Implement |
| DELETE | `/account/addresses/:id` | P2 | — | Implement |
| GET | `/account/orders` | P2 | — | Implement |
| GET | `/account/orders/:id` | P2 | — | Implement |
| GET | `/account/favorites` | P2 | `/favorites` (GET) | **Migrate** to `/account/favorites` |
| POST | `/account/favorites` | P2 | `/favorites` (POST) | **Migrate** |
| DELETE | `/account/favorites/:productId` | P2 | `/favorites/:favoriteId` | **Migrate** — key by `productId` |
| GET | `/account/email-preferences` | P3 | — | Implement |
| PATCH | `/account/email-preferences` | P3 | — | Implement |

---

## 3. Catalog & pricing (storefront reads)

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| GET | `/categories` | P1a | — | Implement |
| GET | `/products` | P1a | `/products` | Keep — add pagination/facets |
| GET | `/products/:slug` | P1a | `/products/:productId` via slug in server wrapper | **Keep slug for PDP** |
| GET | `/products/:productId` | P1a | `/products/:productId` | Implement (internal ID) |
| GET | `/products/:productId/commerce` | P1a | `/products/:productId/commerce` | Keep |
| POST | `/products/commerce` | P1a | `/products/commerce` | Keep (batch) |
| GET | `/products/:productId/inventory` | P2 | `/products/:productId/inventory` | Keep |
| POST | `/products/inventory` | P2 | `/products/inventory` | Keep (batch) |
| GET | `/products/:productId/assets` | P1a | `/products/:productId/assets` | Keep |
| GET | `/promotions/active` | P1a | `/promotions` | **Migrate frontend** |
| GET | `/dealers` | P1a | `/dealers` | Keep |
| GET | `/dealers/lookup?postalCode=` | P2 | partial in api-client | Implement |

### BFF aggregates (optional, recommended)

| Method | Canonical path | Composes | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- | --- |
| GET | `/home/products` | product list rail | P1a | `/home/products` | **Keep** as BFF |
| GET | `/home/banners` | hero banners | P1a | `/home/banners` | **Keep** as BFF |
| GET | `/home/articles` | article list | P1b+ | `/home/articles` | **Keep** as BFF |
| GET | `/storefront/home` | full home payload | P1a | — | Optional single-call alternative |
| GET | `/storefront/config` | site config | P1a | — | Plan only |
| GET | `/storefront/navigation` | nav tree | P1a | — | Plan only |
| GET | `/storefront/footer` | footer | P1a | — | Plan only |

**Rule**: BFF endpoints are thin aggregators over Dashboard-published content + catalog APIs. They must not embed business writes.

---

## 4. Submissions (storefront writes)

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| POST | `/dealer-applications` | P1b | `/dealer-applications` | Keep |
| POST | `/contact/leads` | P1b | `/contact/leads` via `FORM_ENDPOINTS` | Keep |
| POST | `/products/:productId/reviews` | P1b | `/products/:productId/reviews` | Keep |
| GET | `/products/:productId/reviews` | P1b | — | Implement (published only) |

---

## 5. Commerce

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| GET | `/cart` | P2 | `/cart` | Keep |
| POST | `/cart/items` | P2 | `/cart/items` | Keep |
| PATCH | `/cart/items/:itemId` | P2 | `/cart/items/:itemId` | Keep |
| DELETE | `/cart/items/:itemId` | P2 | `/cart/items/:itemId` | Keep |
| DELETE | `/cart` | P2 | — | Implement |
| POST | `/checkout/session` | P2 | — (was `/payments/sessions`) | **Create session here** |
| GET | `/payments/sessions/:id` | P2 | `/payments/sessions` (ambiguous) | **Query status here** |
| POST | `/payments/callback` | P2 | `/payments/callback` | Keep — provider webhook |
| POST | `/orders/cart` | P2 | `/orders/cart` | Keep — optional shortcut to checkout |
| POST | `/orders/direct` | P2 | `/orders/direct` | Keep — optional shortcut to checkout |
| GET | `/orders/:id` | P2 | — | Implement |
| GET | `/orders/:id/status` | P2 | — | Guest order lookup |
| POST | `/inventory/reservations` | P2 | `/inventory/reservations` | Keep |
| DELETE | `/inventory/reservations/:id` | P2 | — | Implement |

### Checkout / order state machine (canonical)

```text
POST /checkout/session
  → payment_session: pending
  → (optional) inventory_reservation: active

POST /payments/callback (verified)
  → payment_session: paid
  → order: paid
  → order_items: price/tax snapshots
  → erp_sync_job: pending

Payment failed/expired
  → payment_session: failed | expired
  → no order, no erp_sync_job
  → release inventory_reservation
```

---

## 6. Dashboard — admin & catalog

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| GET | `/dashboard/users` | P1a | — | Implement |
| POST | `/dashboard/users` | P1a | — | Implement |
| GET | `/dashboard/users/:id` | P1a | — | Implement |
| PATCH | `/dashboard/users/:id` | P1a | — | Implement |
| PATCH | `/dashboard/users/:id/status` | P1a | — | Implement |
| POST | `/dashboard/users/:id/roles` | P1a | — | Implement |
| DELETE | `/dashboard/users/:id/roles/:roleId` | P1a | — | Implement |
| GET | `/dashboard/roles` | P1a | — | Implement |
| POST | `/dashboard/roles` | P1a | — | Implement |
| PATCH | `/dashboard/roles/:id` | P1a | — | Implement |
| GET | `/dashboard/permissions` | P1a | — | Implement |
| PUT | `/dashboard/roles/:id/permissions` | P1a | — | Implement |
| GET | `/dashboard/products` | P1a | `/admin/products` | **Migrate frontend** |
| POST | `/dashboard/products` | P1a | `/admin/products` | **Migrate frontend** |
| GET | `/dashboard/products/:id` | P1a | `/admin/products/:id` | **Migrate frontend** |
| PATCH | `/dashboard/products/:id` | P1a | — | Implement |
| POST | `/dashboard/products/:id/assets` | P1a | — | Implement |
| GET | `/dashboard/categories` | P1a | — | Implement |
| POST | `/dashboard/categories` | P1a | — | Implement |
| PATCH | `/dashboard/categories/:id` | P1a | — | Implement |
| GET | `/dashboard/pricing` | P1a | — | Implement |
| POST | `/dashboard/pricing` | P1a | — | Implement |
| PATCH | `/dashboard/pricing/:id` | P1a | — | Implement |
| GET | `/dashboard/promotions` | P1a | — | Implement |
| POST | `/dashboard/promotions` | P1a | — | Implement |
| PATCH | `/dashboard/promotions/:id` | P1a | — | Implement |
| GET | `/dashboard/sku-mappings` | P1a | — | Implement |
| POST | `/dashboard/sku-mappings` | P1a | — | Implement |
| PATCH | `/dashboard/sku-mappings/:id` | P1a | — | Implement |

---

## 7. Dashboard — content modules

Two patterns are both supported:

**Pattern A — Resource endpoints** (platform plan):

```text
PUT /dashboard/storefront/config
PUT /dashboard/navigation
PUT /dashboard/footer
PUT /dashboard/home-page
PUT /dashboard/legal-pages/:slug
GET/POST/PATCH /dashboard/articles
```

**Pattern B — Module config** (frontend `dashboard-contract.ts`):

```text
GET  /dashboard/modules/readiness
GET  /dashboard/modules/:moduleKey
PUT  /dashboard/modules/:moduleKey
```

| moduleKey | Maps to | Phase | Action |
| --- | --- | --- | --- |
| `navigation` | `/dashboard/navigation` | P1a | Implement A; optional B wrapper |
| `homeHero` | `/dashboard/home-page` (hero section) | P1a | Same |
| `homeCategories` | `/dashboard/catalog` | P1a | Same |
| `dealerProgram` | module payload | P1b | Pattern B |
| `footer` | `/dashboard/footer` | P1a | Pattern A |
| `legalPages` | `/dashboard/legal-pages/:slug` | P1b | Pattern A |

**Recommendation**: Implement Pattern A in API. Add Pattern B as a thin mapping layer for Dashboard UI convenience.

---

## 8. Dashboard — operations

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| GET | `/dashboard/dealer-applications` | P1b | — | Implemented |
| GET | `/dashboard/dealer-applications/:id` | P1b | — | Implemented |
| PATCH | `/dashboard/dealer-applications/:id/status` | P1b | — | Implemented |
| POST | `/dashboard/dealer-applications/:id/notes` | P1b | — | Implemented |
| GET | `/dashboard/contact-leads` | P1b | — | Implemented |
| GET | `/dashboard/contact-leads/:id` | P1b | — | Implemented |
| PATCH | `/dashboard/contact-leads/:id/status` | P1b | — | Implemented |
| POST | `/dashboard/contact-leads/:id/assign` | P1b | — | Implemented |
| POST | `/dashboard/contact-leads/:id/notes` | P1b | — | Implemented |
| GET | `/dashboard/product-reviews` | P1b | — | Implemented |
| GET | `/dashboard/product-reviews/:id` | P1b | — | Implemented |
| PATCH | `/dashboard/product-reviews/:id/status` | P1b | — | Implemented |
| POST | `/dashboard/product-reviews/:id/notes` | P1b | — | Implemented |
| GET | `/dashboard/orders` | P2 | — | Implement |
| GET | `/dashboard/orders/:id` | P2 | — | Implement |
| PATCH | `/dashboard/orders/:id/status` | P2 | — | Implement |
| POST | `/dashboard/orders/:id/assign-dealer` | P2 | `/orders/:id/dealer-assignment` | **Migrate frontend** |
| GET | `/dashboard/erp-sync-jobs` | P2 | — | Implement |
| GET | `/dashboard/erp-sync-jobs/:id` | P2 | — | Implement |
| POST | `/dashboard/erp-sync-jobs/:id/retry` | P2 | — | Implement |
| GET | `/dashboard/email/templates` | P3 | — | Implement |
| POST | `/dashboard/email/templates` | P3 | — | Implement |
| GET | `/dashboard/email/outbox` | P1b read / P3 send | — | Implemented read in P1b |
| POST | `/dashboard/email/outbox/:id/retry` | P3 | — | Implement |
| GET | `/dashboard/operations/alerts` | P3 | — | Implemented; failed and retry-wait ERP/email queue summary |
| GET | `/dashboard/mcp/service-accounts` | P3 | — | Implemented |
| POST | `/dashboard/mcp/service-accounts` | P3 | — | Implemented |
| PATCH | `/dashboard/mcp/service-accounts/:id` | P3 | — | Implemented |
| POST | `/dashboard/mcp/service-accounts/:id/tokens` | P3 | — | Implemented; raw token is returned once |
| DELETE | `/dashboard/mcp/service-accounts/:id/tokens/:tokenId` | P3 | — | Implemented |
| GET | `/dashboard/mcp/invocations` | P3 | — | Implemented |
| GET | `/dashboard/audit-logs` | P1b | — | Implemented |

---

## 9. Support, privacy, integrations

| Method | Canonical path | Phase | Frontend today | Action |
| --- | --- | --- | --- | --- |
| POST | `/support/handoffs` | P1b+ | `/support/handoffs` | Implement when support backend ready |
| POST | `/privacy/consent-events` | P2+ | `/privacy/consent-events` | Implement if legal scope requires |
| POST | `/integrations/erp/webhooks/order-status` | P2 | — | Implement + HMAC |
| POST | `/integrations/erp/webhooks/shipment` | P2 | — | Implement + HMAC |
| POST | `/integrations/erp/webhooks/customer-update` | P2 | — | Implement + HMAC |
| GET | `/health` | P0 | — | Implement |
| POST | `/mcp` | P3 | — | Implemented; `platform.health` and `operations.alerts` tools |
| GET | `/mcp/health` | P3 | — | Implemented |
| GET | `/mcp/tools` | P3 | — | Implemented; service account + `mcp.access` |
| GET | `/cli/erp-sync-jobs` | P3 | — | Implemented; service account + `cli.access` + `erp.sync.read` |
| POST | `/cli/erp-sync-jobs/:id/retry` | P3 | — | Implemented; `erp.sync.retry` |
| GET | `/cli/email/outbox` | P3 | — | Implemented; `email.outbox.read` |
| POST | `/cli/email/outbox/:id/retry` | P3 | — | Implemented; `email.outbox.retry` |

---

## 10. Deprecated / do not implement

| Path | Reason | Replace with |
| --- | --- | --- |
| `/admin/products` | Legacy frontend prefix | `/dashboard/products` |
| `/auth/register` | Ambiguous vs admin | `/auth/customer/register` |
| `POST /payments/sessions` alone | Ambiguous create vs query | `POST /checkout/session` + `GET /payments/sessions/:id` |
| `/promotions` (unqualified GET) | Unclear scope | `/promotions/active` |
| `/favorites` (unauthenticated) | Must be account-scoped in production | `/account/favorites` |
| `/orders/:id/dealer-assignment` | Wrong namespace | `POST /dashboard/orders/:id/assign-dealer` |

---

## 11. Frontend migration checklist

Execute when backend endpoints exist for each phase.

### P1a

- [x] Replace `/admin/products` → `/dashboard/products` in `api-contract.ts` (or remove from storefront contract; dashboard-only)
- [x] Point `server.ts` catalog reads to `/products` and `/products/:slug`
- [x] Use `/promotions/active` instead of `/promotions`
- [x] Keep `/home/*` BFF calls; verify backend implements aggregators
- [x] Add minimal `/dashboard` shell that calls `/auth/*` and `/dashboard/*` through `NEXT_PUBLIC_API_BASE_URL`

### P1b

- [x] Wire `FORM_ENDPOINTS` to `/contact/leads` and `/dealer-applications` (already aligned)
- [x] Product review POST connected to `/products/:productId/reviews`
- [x] Dashboard operations endpoints added for dealer applications, contact leads, product reviews, email outbox read and audit logs

### P2

- [ ] `/auth/register` → `/auth/customer/register`
- [ ] Login/register pages: client-side `api-client` instead of HTML form `action`
- [ ] Checkout: `POST /checkout/session`; poll `GET /payments/sessions/:id`
- [ ] Favorites: move to `/account/favorites`
- [ ] Cart: enable cookie/token session per session strategy in plan v1.1

### P3

- [x] SMTP delivery worker, retries, suppression check and outbox retry control
- [x] Service account lifecycle, one-time Token issue/revocation and MCP audit trail
- [x] Initial MCP `platform.health` tool
- [ ] Email preference endpoints
- [ ] OAuth callbacks when enabled
- [x] CLI operations for ERP/email queue inspection and controlled retries
- [x] Dashboard operational alerts for failed and retry-wait ERP/email work
- [x] Read-only MCP registry with platform health and operational alerts
- [x] Cookie consent event audit endpoint

---

## 12. `API_ENDPOINTS` target shape (reference)

Suggested end state for `src/lib/api/api-contract.ts` (abbreviated):

```typescript
export const API_ENDPOINTS = {
  // BFF
  homeProducts: "/home/products",
  homeBanners: "/home/banners",
  homeArticles: "/home/articles",
  storefrontHome: "/storefront/home",

  // Catalog
  categories: "/categories",
  products: "/products",
  productBySlug: (slug: string) => `/products/${slug}`,
  productById: (productId: string) => `/products/${productId}`,
  productCommerce: "/products/commerce",
  productCommerceDetail: (productId: string) => `/products/${productId}/commerce`,
  productInventory: "/products/inventory",
  productInventoryDetail: (productId: string) => `/products/${productId}/inventory`,
  productReviews: (productId: string) => `/products/${productId}/reviews`,
  promotionsActive: "/promotions/active",
  dealers: "/dealers",
  dealersLookup: "/dealers/lookup",

  // Commerce
  cart: "/cart",
  cartItems: "/cart/items",
  cartItem: (itemId: string) => `/cart/items/${itemId}`,
  checkoutSession: "/checkout/session",
  paymentSession: (id: string) => `/payments/sessions/${id}`,
  paymentCallback: "/payments/callback",
  cartOrder: "/orders/cart",
  directOrder: "/orders/direct",
  order: (id: string) => `/orders/${id}`,
  orderStatus: (id: string) => `/orders/${id}/status`,
  inventoryReservations: "/inventory/reservations",
  inventoryReservation: (id: string) => `/inventory/reservations/${id}`,

  // Account
  accountFavorites: "/account/favorites",
  accountFavorite: (productId: string) => `/account/favorites/${productId}`,

  // Auth
  login: "/auth/login",
  register: "/auth/customer/register",

  // Submissions
  dealerApplications: "/dealer-applications",
  contactLeads: "/contact/leads",

  // Health
  health: "/health"
} as const;
```

Dashboard-only paths remain in `dashboard-contract.ts` under `/dashboard/...`.

---

## 13. Revision history

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-07-08 | Initial draft from architecture review |

**Maintainers**: Update this file whenever adding or renaming `/api/v1` routes. Plan book and handoff should link here instead of duplicating full path lists.
