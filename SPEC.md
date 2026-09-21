# SPEC.md — VanStro platform specification (backend-focused)

Last updated: 2026-07-26
Status: local-verified implementation; production deployment out of scope until authorized.

## 1. Product intent

VanStro sells kitchen cabinets and related home materials in Canada with dealer-backed pickup/delivery. The website is the customer + ops surface; ERP remains the long-term system of record for deep inventory/CRM where integrated.

## 2. Actors

| Actor | Capabilities |
| --- | --- |
| Guest shopper | Browse, cart (`X-Cart-Token`), checkout, guest order token |
| Registered customer | Account profile, addresses, favorites, orders |
| Dealer applicant | Public dealer application form |
| Dashboard admin | RBAC-scoped catalog, orders, CRM, email, CMS, ops |
| Service account | CLI/MCP/Worker machine calls |
| ERP system | Consumes outbound jobs; sends status/shipment webhooks |

## 3. Functional requirements (backend)

### Commerce

- Cart with line items priced from active SKU prices
- Checkout session with `pickup` | `delivery`
- Delivery requires complete Canadian shipping address fields
- Tax from `tax_rates` by province; delivery flat fee configurable
- Inventory reservation on checkout; consume on paid callback
- Payment methods: `card` (Moneris), `pos`, `cash` (manual HMAC)
- Orders expose `statusEvents` and derived `shipment`

### Account & privacy

- Customer auth sessions (Bearer)
- Addresses CRUD; favorites; order history
- Cookie consent events; analytics only with explicit analytics consent

### Website CRM

- Dual-write from registration, guest checkout, cart, favorites, paid orders, contact leads, dealer applications
- Dashboard list/detail/notes/stage; promote to ERP `customer_sync` queue

### Email

- Outbox + template versions
- Worker sends using Dashboard SMTP account when enabled, else env SMTP
- Templates include welcome, shipment, delivered, form acks, etc.

### ERP

- Outbound: `order_create`, `customer_sync`, `inventory_release`
- Inbound: order status / shipment webhooks (shipment may enqueue customer email)
- Catalog pull: merge upstream products/SKUs without overwriting marketing fields
- Worker timed catalog sync via Dashboard API

### Dashboard / CMS

- Full catalog/pricing/promotions/dealers CRUD (permissioned)
- CMS modules: navigation, home, footer, legal, articles
- Ops: alerts, audit logs, payment sessions (mark-paid), analytics summary, email provider

## 4. Non-functional

- API prefix `/api/v1`; envelope `{ data, meta? }` / `{ error, code, fields? }`
- Money: integer cents in DB; `{ amount, currency }` in JSON
- Public writes: rate limits + validation + stable error codes
- Local gates: `pnpm typecheck`, `pnpm test:api`, `pnpm api:smoke`

## 5. Out of scope (current)

- Unauthorized production deploy
- ERP inbound on-hand quantity sync (pending upstream)
- ERP customer-update inbound webhook
- Promotion discount engine at checkout
- Standalone dealer portal product

## 6. Environments

| Env | Notes |
| --- | --- |
| Local | Docker Postgres 16, `VANSTRO_RUNTIME_MODE=development` |
| Production | Requires explicit authorization; target API host TBD by ops |

## 7. Source of truth files

- Types/endpoints: `src/lib/api/api-contract.ts`
- Dashboard ACL: `apps/api/src/dashboard/access.ts`
- Permissions seed: `packages/db/src/permissions.ts`
- Schema: `packages/db/prisma/schema.prisma`
- Continuity: `tasks/handoff.md`
