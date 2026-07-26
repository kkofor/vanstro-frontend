# VanStro P3 Implementation Handoff

Date: 2026-07-14

## P3a Completed: Email Operations

* Worker sends pending and due retry email outbox items through SMTP when the SMTP environment variables are configured.
* Each send writes an `email_delivery_attempt` and `email_event`.
* Delivery failure moves the item to `retry_wait` for five minutes and does not affect the originating business transaction.
* `POST /dashboard/email/outbox/:id/retry` moves a selected email back to `pending` and writes an audit log.
* SMTP configuration is documented in `.env.example`; Office 365 is the default host example and Aliyun-compatible SMTP can use the same variables.
* Stale `running` deliveries are reclaimed after `EMAIL_LOCK_TTL_MS`; delivery has a bounded retry count via `EMAIL_MAX_ATTEMPTS`.
* Suppressed recipients are cancelled before sending. SMTP uses TLS on port 587 plus connection, greeting and socket timeouts.
* Dashboard retry accepts only `retry_wait`, `failed` or `cancelled` items, preventing accidental resend of pending or sent mail.

Required production variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

## P3b Next

* Service account token lifecycle and API authentication.
* MCP health/tool registry and invocation audit log.
* Dashboard email template/version publish workflow and provider connection test.
* CLI queue inspection/retry commands and failure alerts.

## Verified

```bash
pnpm run typecheck
pnpm api:smoke
pnpm worker:once
git diff --check
```
