-- Durable create-token idempotency: the create endpoint now stores a
-- domain-separated idempotency-key hash and a stable request hash on the
-- created token row, so a lost response can be retried with the same key
-- without minting a second token. The partial unique index enforces
-- one-token-per-(account, create key) even under concurrent same-key writes;
-- NULL keys (tokens created before this migration) are excluded.

ALTER TABLE public.service_account_tokens
  ADD COLUMN IF NOT EXISTS "createIdempotencyKey" text;

ALTER TABLE public.service_account_tokens
  ADD COLUMN IF NOT EXISTS "createRequestHash" text;

CREATE UNIQUE INDEX IF NOT EXISTS service_account_tokens_create_idempotency_uidx
  ON public.service_account_tokens ("serviceAccountId", "createIdempotencyKey")
  WHERE "createIdempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS service_account_tokens_create_idempotency_idx
  ON public.service_account_tokens ("createIdempotencyKey")
  WHERE "createIdempotencyKey" IS NOT NULL;
