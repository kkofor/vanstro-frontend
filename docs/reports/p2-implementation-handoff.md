# VanStro P2 Implementation Handoff

Date: 2026-07-14

## Scope Completed

P2 establishes the commerce and ERP fulfillment boundary without moving product or price ownership out of the Dashboard:

* Customer registration is available at `POST /auth/customer/register`; login, refresh, logout and `GET /auth/me` remain bearer-token based.
* Customer account APIs cover profile, addresses, favorites and customer order history under `/account/*`.
* Anonymous carts use a returned `cartToken`; authenticated customers use a customer-owned cart.
* `POST /checkout/session` re-reads active platform SKU prices and inventory snapshots, creates a pending payment session plus expiring inventory reservations, and does not create an order or ERP job.
* `POST /payments/callback` requires `x-payment-signature`. A verified `paid` callback atomically creates the paid order, item price snapshots, status event and `order_create` ERP job. Replays return the same order without duplicate jobs.
* Guest order detail/status requires the returned order token; customers can read their own orders under `/account/orders`.
* Inventory reads, explicit reservation/release, expiry release and payment-session expiry are implemented.
* ERP order status webhooks require `x-erp-signature`, are recorded in `erp_webhook_events`, and update the platform order/status event.
* Dashboard API exposes payment sessions, orders, ERP jobs (list/detail) and a manual retry action. The existing Dashboard shell is intentionally not expanded into a full P2 visual console.
* Worker expiry processing releases stale reservations. When `ERP_API_BASE_URL` and `ERP_SERVICE_TOKEN` are configured, it pushes paid orders to `POST {ERP_API_BASE_URL}/orders` with the platform order ID as `Idempotency-Key`, records attempts and creates an ERP order link on success.

## Schema And Configuration

Applied local migrations:

* `20260714100000_p2_commerce`
* `20260714101000_p2_order_status_events`

New P2 tables include customer addresses, favorites, carts/cart items, inventory snapshots/reservations, payment sessions, orders/order items and order status events.

Required production configuration:

* `NEXT_PUBLIC_API_BASE_URL` must point the static storefront at the deployed Website API.
* `PAYMENT_CALLBACK_SECRET` must be the payment provider webhook secret.
* `ERP_WEBHOOK_SECRET` must be the ERP webhook secret.
* `ERP_API_BASE_URL` and `ERP_SERVICE_TOKEN` enable outbound ERP order delivery.

The development-only payment callback fallback secret is never used when `NODE_ENV=production`.

## Storefront Cutover

The product purchase action now persists additions through `POST /cart/items` before updating the existing cart UI. Checkout uses `POST /checkout/session` and displays the resulting pending payment state instead of creating a browser-only fake paid order. A payment provider redirect/client SDK remains the final external integration point; its signed callback is already implemented on the API.

## Verified

Completed locally after migration and seed:

```bash
pnpm --filter @vanstro/db exec prisma validate --schema prisma/schema.prisma
pnpm run typecheck
pnpm api:smoke
pnpm worker:once
pnpm run build:pages
git diff --check
```

`api:smoke` now proves these P2 invariants:

* Customer registration and authenticated account read succeed.
* An anonymous cart receives a token, accepts a product and creates a checkout session against seeded inventory.
* A pending payment session creates no order.
* An invalid payment signature is rejected.
* A valid signed callback creates exactly one paid order and exactly one ERP sync job.
* Replay of the same signed callback does not duplicate either record.
* Guest order detail and status reads require and accept the guest order token.

## Production Follow-Up

The first live payment provider and the ERP team's exact `POST /orders` response shape still need integration testing before production launch. The worker expects a successful ERP response shaped as `{ "erpOrderId": "..." }`; if their contract differs, adapt only `pushPendingErpOrders` in `apps/worker/src/index.ts`.
