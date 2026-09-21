# H2 Payment Session Access TTL

Payment-session access uses the existing 30-minute `expiresAt` TTL issued during checkout. The TTL is centralized as `PAYMENT_SESSION_TTL_MS` in `apps/api/src/routes/commerce/index.ts`; no new error code or secret is introduced.
