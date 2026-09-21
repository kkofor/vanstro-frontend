# Integration — F1 v1.5 HMAC Decision Closed; Next HARD BLOCKED

## Conclusion

The authorized authenticated-subject HMAC/Consent decision was encoded byte-exactly into the sole authority model and verified with shared Node/PostgreSQL reference vectors. The continuous Goal then resumed and closed ordinary model/schema/generator/verifier/manifest/review findings.

Final independent reviews nevertheless found the next genuine hard decision:

1. Exact executable PostgreSQL CHECK predicates are not uniquely frozen; several physical constraints remain English summaries with unresolved NULL/three-valued-logic behavior.
2. Complete PostgreSQL ACL authority is not uniquely frozen: schema CREATE/USAGE, table/sequence CRUD, PUBLIC, inherited privileges and exact 69/70 GRANT/REVOKE matrices remain absent.
3. The source-only baseline retains five `unknown_requires_owned_probe` facts concerning overload absence, deployed checksums, owners, memberships/inheritance and effective privileges. Resolving these requires owned PostgreSQL 16 probes and binding their outputs.

These match continuous Goal hard-stop clauses 2, 7, and 11. The package remains `CANDIDATE — NOT AUTHORITY`; it is not FROZEN.

## Authorization and baseline

- HMAC decision: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-v15-authenticated-subject-hmac-decision.md`
- Decision identity: 184 LF lines / 10648 bytes / SHA `21fb4121ea844f2e22029ca28bfad29f8d1ca24e9431a987ace84ac07d3ace7d`.
- Continuous Goal identity: SHA `c1d71c2d867560859672b5665df200f05a80ac726de25b881e26c798755f0cfc`.
- Integration start: `154f483d8f499dfa87850a1d18f57562ad94c43d` / tree `a7ba4c87ef1736600670e24c1ffb919e5dc55eee`.
- Main/Backend/Frontend remained `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`.
- Source migrations remained 68; migration69/70/71 absent.

## Byte-exact HMAC authority

- Domain ASCII bytes: `vanstro.analytics.authenticated-subject.v1` (42 bytes; hex `76616e7374726f2e616e616c79746963732e61757468656e746963617465642d7375626a6563742e7631`).
- Realm ASCII bytes: `vanstro.authenticated-user.v1` (29 bytes; hex `76616e7374726f2e61757468656e746963617465642d757365722e7631`).
- Message field order: domain, realm, canonical actor UUID raw 16 bytes.
- Each frame: unsigned 32-bit big-endian byte length followed by bytes; no delimiter/NUL/null/empty field.
- Algorithm/output: HMAC-SHA-256, 32-byte digest.
- Actor source: Backend-verified session canonical `User.id`; exact lowercase RFC4122 canonical text only, no trim/lowercase normalization.
- New authority storage: `authenticatedSubjectDigest bytea` with 32-byte CHECK. Legacy `subjectDigest text` remains permanent compatibility mirror only and is not authorization, release identity or distinct-subject authority.

## KID, epoch and consent

- KID regex: `^[a-z0-9][a-z0-9._-]{0,31}$`.
- New consent/event writes: active KID only.
- Epoch: `vanstro.analytics.subject-epoch.v1:` + row `subjectKeyVersion`.
- Exact consent tuple: digest, KID, fixed realm, epoch, consent schema version.
- Latest ordering: `createdAt DESC, id DESC`.
- Active grant actions: `granted|updated` with `analytics=true`; `withdrawn`, analytics false, unknown action/version or incomplete/mismatched tuple fail closed.
- Previous KID historical verification window: `retiredAt + P30DT10M`; it cannot create consent/event or authorize a new epoch.
- Legacy anonymous/incomplete consent never authorizes authenticated ingestion; no automatic backfill, promotion, rekey or subject inference.
- Each release family has exactly one identity epoch; cross-epoch windows/subject/metric merge are forbidden.

## Golden vectors

Twelve vectors are frozen in the model using:

- KID `test-kid-a`, key `000102...1f`;
- KID `test-kid-b`, key `ffeedd...1100`;
- six canonical UUIDs covering first/last byte boundaries.

Node and PostgreSQL reference semantics (`int4send(octet_length(x)) || x`, `pgcrypto.hmac`) matched every fixed message and digest byte-for-byte. Mutation tests cover field order, u64/little-endian lengths, UUID text vs raw16, domain/realm/KID/epoch drift, noncanonical UUIDs, partial tuple, anonymous consent, legacy mirror authority and storage drift.

## Continuous-loop fixes after HMAC closure

- Generator now emits object-shaped migration69/code-switch/migration70 ledger content instead of `_None_`.
- P10 generated Contract includes the complete structured authenticated-subject authority and vectors.
- Closed inventory is required for all authority collections.
- Exact P08 transition inventory and replacement-CHECK state metadata are required.
- Job `(jobType, version)` dispatch identity is unique.
- Compatibility matrix requires new+68 fail-closed and new+69/new+70 healthy.
- Semantic mutation declarations must expect failure.
- Manifest-bound tests resolve only manifest-bound tooling and execute from the package layout.
- Role phase grants now equal exact function caller refs.
- Fact-to-Audit FK/UNIQUE physical mappings are checked.
- P10 suppression k=3 and all release-cell numeric persistence targets are typed and closed.
- Baseline source objects are path+hash bound rather than accepting another source's hash.

## Stable reviewed candidate

The last fully executed stable review target before the final hard-blocker determination was:

- 22-member manifest: `717420a552b40cdd8eb429f681b8a5b41d1ff60f25ce9414492b8920d9574b38`
- metadata: `ce14ca6e1eae0d83889ccf0dc5247e3e776f8e7168144947bdefdbab994777b9`
- packaged tests: 51/51 passed
- actual semantic verifier: PASS, 356 objects / 13 generated members
- manifest: 22/22 members verified

Subsequent uniquely determined tooling/source corrections changed candidate bytes; no later manifest is claimed as reviewed or frozen. Old review results are not reused.

## Final review findings and next decision

### A. Exact CHECK DDL

Examples such as `constraint.import.source_state_v2`, `constraint.import.token_v2`, `constraint.export.binding_v2`, `constraint.release.state`, and `constraint.cell.privacy_state` still use prose summaries rather than executable PostgreSQL predicates. Multiple predicates with different NULL semantics satisfy the prose. A new authority decision must freeze exact SQL expressions and exhaustive allowed/forbidden tuple vectors.

### B. Complete ACL matrix

The machine source must freeze:

- schema CREATE/USAGE per role and PUBLIC;
- table/sequence owner and direct SELECT/INSERT/UPDATE/DELETE/USAGE matrices;
- function EXECUTE for PUBLIC and roles;
- inherited membership effects;
- exact migration69 and migration70 GRANT/REVOKE operations;
- guard-owner `public CREATE` disposition;
- whether protected objects stay in `public` with CREATE revoked or move to a dedicated non-writable schema.

Current authority cannot uniquely choose between these safe architectures.

### C. Owned PostgreSQL probes

The baseline still requires environment-derived proof for:

- absence of undeclared/stale overloads;
- deployed checksums matching source migrations1–68;
- effective owners;
- role memberships/inherited privileges;
- effective runtime/PUBLIC table/function privileges.

These probes must run in an owned disposable PostgreSQL 16 environment and their deterministic outputs/hashes must become manifest members. No production database access is authorized or required.

## Gate results

- Repo-local tooling/HMAC suites before final review: 60/60 PASS.
- Manifest-bound package suites after relocation fixes: 51/51 PASS.
- Baseline deterministic regeneration: PASS, SHA `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`.
- Generator byte verification: PASS.
- Actual semantic verification: PASS for reviewed stable target.
- Contract/architecture/rollout review: BLOCKER on exact DDL and unresolved physical baseline.
- Security/privacy/database review: BLOCKER on complete ACL authority and unresolved owned probes.
- FROZEN: not permitted.

## Boundaries preserved

- No product code, Prisma schema, product tests or migrations1–68 changed.
- No migration69/70/71 created.
- No Main/Backend/Frontend promotion.
- No Stage C, production database, credential, provider, GA4/PostHog/Search Console, backfill or deployment.
- No push/fetch/PR, stash operation, reset/rebase/force/clean or historical worktree cleanup.

`production deploy: deferred until full Dashboard completion`
