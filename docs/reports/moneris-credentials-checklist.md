---
title: Moneris esqa credentials checklist
date: 2026-07-26
status: awaiting-credentials
---

# Moneris credentials checklist (local / QA)

Local e2e currently uses `PAYMENT_PROVIDER=manual` (HMAC callback). The Moneris provider is wired in `apps/api/src/payments/moneris.ts` and selected when:

```text
PAYMENT_PROVIDER=moneris
MONERIS_ENVIRONMENT=qa
MONERIS_STORE_ID=...
MONERIS_API_TOKEN=...
MONERIS_CHECKOUT_ID=...
```

## Required from business / payment owner

| Variable | Purpose | Example shape |
| --- | --- | --- |
| `MONERIS_STORE_ID` | Moneris store id (esqa) | store-assigned id |
| `MONERIS_API_TOKEN` | API token for Checkout preload/receipt | opaque token |
| `MONERIS_CHECKOUT_ID` | Moneris Checkout configuration id | opaque id |
| `MONERIS_ENVIRONMENT` | `qa` (esqa) or `prod` | `qa` for local/test |

## After credentials arrive

1. Put values in local `.env` (never commit them).
2. Set `PAYMENT_PROVIDER=moneris`.
3. Restart API.
4. Exercise checkout → preload ticket → client Checkout SDK → receipt verify callback.
5. Keep `PAYMENT_CALLBACK_SECRET` for any residual manual/HMAC tooling; Moneris verify uses receipt API, not that secret.

## Not yet provided

- store_id
- api_token
- checkout_id
