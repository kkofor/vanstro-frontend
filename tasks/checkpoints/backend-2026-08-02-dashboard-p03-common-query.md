# Backend checkpoint — Dashboard P03 Common Query / Search Contract

Date: 2026-08-02

## Identity and scope

- Worktree/branch: `.claude/worktrees/backend`, `feature/backend`.
- Parent/shared baseline: `d3665ac9206b53b2a56c35091bf4f2cbd031a40d`.
- Frozen contract: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p03-common-query-search-contract-20260802.md`, SHA-256 `2bbdf5c4378414defddb71743a0d7898f453c21b1a914f1eb2a1c194edd98684`.
- Bounded scope: common-query.v1 core; Products strict offset and Dealers scope-bound cursor proofs; permanent CRM/Reconciliation serializer/search security corrections; Overview permission parity; strict distributed limiter; capability contract and regressions.
- Excluded: schema/migration/index creation, Global Search endpoint/UI, Saved Views, Export/Import, new business mutation, P04, production/deployment/push/PR/stash.

## Implemented behavior

- Shared eight-profile registry, typed immutable strict parser, structural/version precedence, fixed errors, exact metadata, stable ID ordering, public contract types, and server capability `commonQueryV1`.
- RFC8785-style canonical JSON and domain-separated query/grant/field-profile SHA-256 fingerprints.
- AES-256-GCM `cq1.kid.nonce.ciphertext.tag` cursor, strict keyset, active/decrypt-only rotation, AAD, 15-minute lifetime, skew checks, payload validation, and injectable test clock/nonce.
- Products strict offset uses explicit safe DTO, exact/prefix ASCII search without SKU name, allowlisted filters/sorts, nested SKU tie, and repeatable-read read-only row/count transaction. Legacy mode remains unchanged.
- Dealers strict cursor uses immutable ID ordering, code-only exact/prefix search, scope-safe filters and nested Location projection. Legacy mode remains unchanged.
- P02 scoped-role permission keys enter `contextRevision`; permission-specific grant fingerprints bind cursors.
- Authenticated Dashboard responses are private/no-store. Strict proof requests consume an authorization-first, PostgreSQL-serialized two-window limiter (10/second and 60/minute), with accepted-only accounting and fail-closed store errors.
- CRM rejects every present legacy `q`; list/detail/contact/task/note/promote responses use resource-specific safe DTOs with global-only supplementary PII grant. Free text, tags, linkage IDs, owner email, ERP details and raw payloads are omitted.
- Reconciliation GET/PATCH use safe projections/serializers, ordered safe events, masked provider references only under global supplementary permission, and no raw Prisma session/provider reason response.
- Overview executes Dealer count only when both `dashboard.access` and `dealers.read` are global.

## Verification

Successful on Node `22.22.2`:

- Full TypeScript: passed.
- Full API after actual fourth-review remediation: `156/156` passed. Earlier implementation/review runs were `148/148`, `150/150`, and `155/155`.
- DB: `5/5` passed.
- Worker: `11/11` passed.
- Package/shared contracts: `119/119` passed.
- Focused query/config: `15/15` passed.
- Focused Products/Dealers/capability: `3/3` passed.
- Focused sensitive GET/CRM/Overview: `3/3` passed as part of focused aggregate; full API covers all cases.
- Strict distributed limiter: `2/2` passed, including concurrent accepted-only burst and rolling minute boundary.
- Backend build: passed.
- Prisma generate/validate: passed.
- Existing-database preflight: `{ "ok": true, "failures": [] }`.
- Migration status: 42 migrations; local database schema up to date.
- `git diff --check`: passed.
- Credential-pattern scan: only documented placeholder examples.

Not run / blocked:

- Destructive `api:smoke` stopped at its guard because the configured database is `vanstro_dev`, not test/smoke named; the guard was not bypassed.
- No browser, Frontend, staging, production, deployment, production migration/write, real payment/refund, ERP, push, PR or stash operation.
- Seven iterative correctness/security review passes found and closed all High/Medium issues. Repairs now derive capability/handler keysets and readiness metadata from startup validation; expose non-secret activeKid and a domain-separated, key-byte-sensitive, order-independent generationHash; enforce complete oversized-query precedence after semantic/cursor phase B validation; split Dealer cursor phase A authorization binding from phase B semantic binding; use explicit PostgreSQL `C` collation, deterministic ASCII folding, ASCII-only predicates and escaped literal LIKE matching inside the Products repeatable-read transaction; return complete CRM event arrays; omit empty/null guest PII; standardize Reconciliation PATCH errors; and require explicit server-owned operational readiness before strict profiles are enabled. A coordinator audit proved an initially reported fourth-review fix had not actually landed; that false report was corrected. The permanent worktree now contains `ESCAPE chr(92)`, raw URL query bytes, independent Products/Dealers readiness flags, and deferred Dealer phase-B size checks, with direct Read/rg evidence and real-DB regressions. The seventh final correctness and security reviews found no remaining High/Medium issue.

## Migration and production status

- Source schema/migration added: no.
- Local migration applied for P03: no.
- Production remains `3904a440` and 41 migrations; no production action occurred.
