-- Durable revoke-token idempotency: the revoke endpoint now stores a
-- domain-separated idempotency-key hash and a stable request hash on the
-- revoked token row, so a lost response can be retried with the same key
-- without a second revoke transition or a second audit row. The partial
-- unique index enforces one-revoke-per-(account, revoke key) even under
-- concurrent same-key writes; NULL keys (tokens revoked before this
-- migration) are excluded.

ALTER TABLE public.service_account_tokens
  ADD COLUMN IF NOT EXISTS "revokeIdempotencyKey" text;

ALTER TABLE public.service_account_tokens
  ADD COLUMN IF NOT EXISTS "revokeRequestHash" text;

CREATE UNIQUE INDEX IF NOT EXISTS service_account_tokens_revoke_idempotency_uidx
  ON public.service_account_tokens ("serviceAccountId", "revokeIdempotencyKey")
  WHERE "revokeIdempotencyKey" IS NOT NULL;
