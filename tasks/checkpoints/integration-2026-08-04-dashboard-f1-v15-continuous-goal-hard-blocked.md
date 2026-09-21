# Integration — F1 v1.5 Continuous Goal HARD BLOCKED

## Conclusion

The continuous Goal closed the original `REFERENCE_CYCLE: wire.job`, repaired the SQL-return wire family, strengthened reference/ownership/ledger checks, and reached green tooling plus actual semantic execution. Pre-review adversarial review then found a hard design decision that cannot be uniquely derived from current authority:

> The P10 authenticated-subject HMAC/consent authority does not freeze the byte-exact HMAC framing, domain constant, authenticated subject source, KID/identity-epoch rotation behavior, consent lookup tuple, or cross-runtime golden vectors.

At least two materially different and superficially compliant implementations remain possible. This matches continuous Goal hard-stop clauses 2, 7, and 11. The package therefore remains `CANDIDATE — NOT AUTHORITY`; no valid final dual review or FROZEN claim exists.

## Authorization and baseline

- Goal: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-v15-authority-package-continuous-goal.md`
- Identity: 246 LF lines / 10340 bytes / SHA `c1d71c2d867560859672b5665df200f05a80ac726de25b881e26c798755f0cfc`.
- Integration start: `474a3807e1f9096d406a7e775e830460da01de1a` / tree `005307d632d7d8850577b6152e363725cdc1fbd4`.
- Main/Backend/Frontend: `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`.
- Main protected untracked: 80; manifest `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`.
- Stash: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.
- Source migrations: 68; migration69/70/71 absent.

## Continuous-loop work completed

### Loop 1 — reference graph ontology

- Classified dependency, ownership, integrity-backref, and provenance edges without an ID allowlist.
- Kept global dangling checks and dependency-cycle rejection.
- Legal descriptor↔wire↔schema closure now passes dedicated Job checks.
- Added mutations for legal closure, dependency cycle, missing backref, cross-Job binding, dangling target, unknown reference key, non-suffix grants, ownership parity, and local state targets.

### Loop 2 — SQL-return wire closure

All three `sql_return` wires were derived from the exact SQL function return name/order/type/nullability:

- `wire.p09_readiness`
- `wire.p10_release`
- `wire.p08_finalize_import_source_sql_return`

No SQL function signature was changed.

### Loop 3 — actual-model/tooling shape closure

- Corrected verifier handling for actual model fields: `arguments/sqlType`, `replacementConstraintRef`, actual compatibility matrix shape, P02 resolver refs, P09 role/action refs, and actual v1.4 mutation IDs.
- Added non-suffix `grants69`, `grants70`, and `members` reference discovery.
- Added table-child ownership parity and local state-reference checks.
- Closed migration69 physical-ledger omission of both P10 release tables and added exact 69/70 physical object parity.
- Extended v1.5 manifest helper to include model, schema, baseline, all 13 generated members, generator, semantic verifier, and tests.

## Current identities

- Model: `be167e0a015f3720ccb361cb0be1fd7cc4dfc88121d69e8076b9c201e7a66d36`
- Schema: `b810559f0415b8cad3bae73a3c919da32355b5751ca816d10971d8b89b493624`
- Baseline: `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`
- Generator: `2df03d8b50f4ab50e26a4d93ee4ba66063b05141b3446d0c8bae208d90c0b3bf`
- Semantic verifier snapshot: `e8bc73e86bd76bc00a698d2e32297de1ee9cb4d7b910f34a0e78765687d656cb`
- Baseline extractor: `95907fe74bb82eb5a2439cd1ca1adc92e6d5f6e24ef4bc1a9673bb3cbf2199b5`
- Authority tests: `7c89d26b1aaf8a25d22f4bec3165948919a7ed406d5fedc739e8dad0d11a11fe`
- Baseline tests: `17b8ff5d0cef4944bf35e4c14222da1dc469650e4471184c6c191f22d498573d`
- Current 21-member manifest SHA: `4faf1944f3d3aea9d7710d7293aa921567c1f93fa49a846bd9b4d4f82ffd0564`
- Manifest metadata SHA: `58ef192f188599d1d194d30fb58448b3935b184a8daf9c70f10c3d2a665bd52a`

The earlier `00e6f43b...` review target was invalidated by candidate changes and is not certification evidence. Reviews started against it were stopped and discarded.

## Gate results

- Authority/tooling tests: 46 discovered / 46 passed / 0 failed / 0 skipped / 0 not-executed.
- Actual semantic verifier: PASS, 347 globally indexed objects, 13 generated members.
- Baseline deterministic regeneration: PASS; byte SHA remains `bfa3a3...abcfc`.
- Generator byte verify: PASS.
- Manifest helper tests: PASS, including nested v1.5 member closure.
- Formal 21-member manifest verify: PASS for the recorded current manifest before this checkpoint update.
- Diff check: PASS before checkpoint/handoff edits.
- Secret-pattern scan: no match.
- Forbidden-language scan: only the baseline inventory's descriptive phrase `role membership may pre-exist outside migration source`; no candidate normative `TBD/MAY/implementation-defined/future helper` finding.

These green gates are pre-review evidence only and do not override the hard authority gap below.

## Hard blocker: P10 HMAC and consent authority is not unique

Current model statements require server-held domain-separated HMAC-SHA-256 and authenticated consent, but do not freeze:

1. exact HMAC domain byte string;
2. exact length-prefix width, endianness, field order, text encoding, Unicode normalization, null/empty framing, and timestamp representation;
3. authoritative subject source and subject-type/realm tag;
4. active/previous KID selection and rotation overlap;
5. identity epoch derivation and its relationship to KID;
6. exact consent lookup tuple and precedence;
7. behavior for historical consent/event rows across KID/epoch rotation;
8. SQL/application golden vectors proving byte-identical derivation.

Concrete ambiguity:

- Implementation A can frame `realm || subjectId` with 32-bit big-endian lengths and bind consent on `(subjectDigest, KID, realm, schemaVersion)`.
- Implementation B can frame `subjectId || realm` with 64-bit lengths and bind consent on `(subjectDigest, identityEpoch, schemaVersion)` while selecting KID independently.

Both satisfy the present natural-language text but produce different digests and authorization outcomes. Choosing one changes significant security and privacy behavior and is not uniquely determined by current authority.

The nullable migration69 consent columns also leave multiple backfill/compatibility interpretations. Resolving this may require a design choice about whether legacy anonymous-only rows remain ineligible forever, become explicitly legacy-incomplete, or are rebound under authenticated proof. No production access or backfill was performed.

## Required user decision

Authorize one exact P10 authenticated-subject derivation/rotation/consent-binding specification, including golden vectors and legacy-row disposition. The recommended safe choice is:

- a fixed versioned domain constant;
- unsigned 32-bit big-endian length-prefixed UTF-8 NFC fields in a frozen order;
- authenticated actor UUID plus fixed identity-realm version as the only subject input;
- consent lookup requires exact digest + KID + identity epoch/realm + consent schema + active consent state;
- anonymous-only or legacy incomplete consent never authorizes ingestion;
- previous KID may verify historical rows only during a bounded declared rotation window and never authorizes a new consent without exact binding;
- cross-language SQL/Node golden vectors become model members and mutations.

Alternative safe designs exist, so this recommendation requires explicit authorization rather than silent selection.

## Review status

- The first review attempts were invalidated because the candidate changed after review start.
- Pre-review adversarial reviews found additional checker gaps; uniquely determined tooling gaps were repaired where possible.
- A complete pair of final reviews was not run against the current 21-member manifest because the P10 hard blocker makes FROZEN impossible.
- No review result is being presented as final certification.

## Boundaries preserved

- No product code, Prisma schema, product tests, or migrations1–68 changed.
- No migration69/70/71 was created.
- No Main/Backend/Frontend promotion.
- No Stage C, production database, credential, provider, backfill, deployment, push, fetch, PR, stash, reset, rebase, force, clean, or historical-worktree cleanup.

`production deploy: deferred until full Dashboard completion`
