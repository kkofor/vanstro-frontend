# VanStro P1b Implementation Handoff

Date: 2026-07-08

## Scope Completed

P1b now covers the first submission and moderation loop:

* Public `POST /contact/leads` accepts JSON or HTML form submissions and creates `contact_leads`.
* Public `POST /dealer-applications` accepts JSON or HTML form submissions and creates `dealer_applications`.
* Public `POST /products/:identifier/reviews` creates pending `product_reviews`.
* Public `GET /products/:identifier/reviews` returns published reviews only.
* Catalog product reads now include `ratingSummary` and `reviews` from published reviews only.
* Product review modal now submits to the Website API instead of localStorage.
* Each public submission creates a pending `email_outbox` item for internal notification. SMTP sending remains P3.
* Dashboard API can list/detail/update/note dealer applications, contact leads and product reviews.
* Dashboard API can assign contact leads to an admin user or dealer id.
* Dashboard API exposes read-only `GET /dashboard/email/outbox` and `GET /dashboard/audit-logs`.
* `/dashboard` shell now includes tabs for Applications, Leads, Reviews, Email outbox and Audit logs.

## Migration

Applied locally:

```bash
pnpm --filter @vanstro/db exec prisma migrate dev --name p1b_submissions_reviews --schema prisma/schema.prisma
```

Created:

* `packages/db/prisma/migrations/20260708232835_p1b_submissions_reviews/migration.sql`

New tables/enums:

* `ContactLeadStatus`, `DealerApplicationStatus`, `ProductReviewStatus`
* `contact_leads`, `contact_lead_notes`
* `dealer_applications`, `dealer_application_notes`
* `product_reviews`, `product_review_notes`

## Verified

Completed after implementation:

* `set -a; [ -f .env ] && . ./.env; set +a; pnpm --filter @vanstro/db exec prisma validate --schema prisma/schema.prisma`
* `pnpm run typecheck`
* `pnpm api:smoke`
* `pnpm worker:once`
* `pnpm run build:pages`
* `git diff --check`

`api:smoke` now covers:

* Contact lead public submit, Dashboard list/detail/assign/status/note.
* Dealer application public submit, Dashboard list/detail/status/note.
* Product review public submit as pending.
* Pending review does not appear in public review reads.
* Dashboard publish action makes the review appear in public review reads.
* Three P1b submissions create three pending `email_outbox` records.
* Dashboard email outbox and audit log reads.

## Boundaries

* P1b does not send email. It only writes `email_outbox`; provider delivery and retry controls are P3.
* P1b does not create orders, payment sessions or ERP sync jobs. Commerce remains P2.
* Contact lead assignment stores admin/dealer ids for routing; deeper CRM ownership, SLA and follow-up automation remain later work.
* Review moderation is status-based. Rich media, photo uploads and verified-buyer checks are not included yet.

## 2026-07-09 Follow-up Audit Fixes

* API now handles browser CORS/preflight for VanStro storefront and local development origins, so static storefront pages, product review modal and Dashboard fetch calls can reach Website API cross-origin.
* `VANSTRO_CORS_ORIGINS` is documented in `.env.example` for deployment-specific allowed origins.
* Public `GET /products/:identifier/reviews` now returns a sanitized review view model only: id, display name, title, body, rating, createdAt and verifiedBuyer. It no longer exposes reviewer email, acceptedTerms or internal moderation fields.
* `pnpm api:smoke` now verifies CORS preflight and asserts that public published review responses do not leak private reviewer fields.

## Next Work

* P2: customer auth/register route alignment, cart/session strategy, checkout session, payment callback, orders and ERP sync jobs.
* P3: SMTP provider adapter, email retry endpoint, templates UI, MCP/service-account operational surface.
