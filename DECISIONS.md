# DECISIONS.md — Architecture Decision Records (VanStro backend)

Format: short ADRs. Newest first.

---

## ADR-014 — Full-launch commit policy (2026-07-26)

**Decision:** Ship launch-loop work as one local commit after gates; do not push unless asked.

**Why:** User scope「全量」+ explicit no mid-commits / no push.

**Status:** Accepted

---

## ADR-013 — Consent-gated first-party pageviews (2026-07-26)

**Decision:** `POST /analytics/pageviews` requires `consentAnalytics: true`; store only path/session/UTM metadata.

**Why:** Privacy / cookie policy; no third-party analytics dependency for ops PV.

**Rejected:** Always-on tracking; client-only counters.

**Status:** Accepted (immutable without legal review)

---

## ADR-012 — Worker catalog sync over HTTP (2026-07-26)

**Decision:** Worker calls `POST /dashboard/catalog/sync-from-erp` with service account token; records `CatalogSyncRun`.

**Why:** Reuse ACL and sync implementation; avoid `@vanstro/api` dependency in worker package.

**Status:** Accepted

---

## ADR-011 — Dashboard-managed SMTP with env fallback (2026-07-26)

**Decision:** Prefer `EmailProviderAccount` (`default_smtp`); fall back to `SMTP_*`. Deployment mode does not require SMTP at worker boot.

**Why:** Ops can change mail without redeploy; empty SMTP should not crash the process.

**Status:** Accepted

---

## ADR-010 — Dashboard mark-paid for POS/cash only (2026-07-26)

**Decision:** `POST /dashboard/payment-sessions/:id/mark-paid` allowed only when status is `pending` and method is not `card`; internally HMAC-calls payment callback via dynamic `createApp` import.

**Why:** Card must be confirmed by Moneris; avoid circular import with top-level `createApp`.

**Status:** Accepted

---

## ADR-009 — Order statusEvents + shipment projection (2026-07-26)

**Decision:** Persist status history events; derive `shipment` from shipment-sourced payloads for customer APIs.

**Why:** Single timeline for guest/account/Dashboard; ERP shipment webhook can email without duplicating order shape.

**Status:** Accepted

---

## ADR-008 — Website CRM vs ERP CRM boundary (2026-07-28)

**Decision:** Website CRM is first-class in Dashboard; ERP CRM is queue-only (`customer_sync`) with read-only sync status.

**Why:** Clear ownership; see `docs/reports/dashboard-erp-crm-handoff-2026-07-26.md`.

**Status:** Accepted

---

## ADR-007 — Canada Post AddressComplete proxy (2026-07-26)

**Decision:** Server-side proxy `GET /address/autocomplete`; never expose vendor key to browser.

**Why:** Key safety; optional when key missing (manual address UX).

**Status:** Accepted

---

## ADR-006 — Payment providers: Moneris + manual (2026-07-26)

**Decision:** `card` → Moneris Checkout; `pos`/`cash` → manual HMAC callback. Local default remains runnable without Moneris credentials.

**Why:** Canadian card acquiring + in-store settlement.

**Rejected (for now):** Stripe-only; all-manual forever.

**Status:** Accepted

---

## ADR-005 — Provincial tax table + flat delivery fee (2026-07-26)

**Decision:** Seed `tax_rates` for Canadian provinces; apply combined rate by dealer/shipping province; delivery fee from `DELIVERY_FLAT_FEE_CENTS`.

**Why:** User chose GST/PST/HST-by-province and free pickup + flat delivery.

**Note:** Rates are business-editable; not tax advice; final policy unconfirmed by finance.

**Status:** Accepted (rates subject to business change)

---

## ADR-004 — Inventory reservation then consume on pay (2026-07)

**Decision:** Checkout increments `quantityReserved`; payment callback consumes reservation and updates on-hand/reserved in the payment transaction path.

**Why:** Prevent oversell between checkout and pay.

**Open question:** Long-term ERP ownership of on-hand vs website adjustments — confirm with product before changing again.

**Status:** Accepted (document carefully)

---

## ADR-003 — API envelope and stable error codes

**Decision:** Success `{ data, meta? }`; errors `{ error, code, fields? }` with stable `PublicApiErrorCode`.

**Why:** Frontend i18n and retry logic.

**Status:** Accepted

---

## ADR-002 — RBAC permission keys for Dashboard

**Decision:** Explicit permission strings in `INITIAL_PERMISSIONS`; every dashboard route mapped in `access.ts`; UI tabs gated in `tab-permissions.ts`.

**Why:** Least privilege for admin users and service accounts.

**Status:** Accepted

---

## ADR-001 — Monorepo: API + Worker + DB + Next storefront

**Decision:** Single pnpm workspace; shared Prisma package; Next app at repo root `src/`.

**Why:** Contract sharing and local full-stack DX.

**Status:** Accepted
