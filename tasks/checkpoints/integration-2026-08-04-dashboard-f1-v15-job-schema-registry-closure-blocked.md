# Integration — F1 v1.5 Job Schema Registry Closure BLOCKED

## Conclusion

The authorized Job descriptor/payload-schema ontology was added to the v1.5 model and tooling, but the semantic fixture suite produced a new failure:

```text
REFERENCE_CYCLE: wire.job
```

The positive fixture failed and 19 later mutation assertions were shadowed by the same cycle. Per authorization, execution stopped without further automatic repair; actual candidate semantic verification and independent reviews were not run.

## Authorization and baseline

- Prompt: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-v15-job-schema-registry-closure-coordinator-prompt.md`
- Identity: 178 LF lines / 8169 bytes / SHA `e73d2a683efd44668e6215312aca284d63cdd32dd192f3617784eece898254cb`.
- Integration start: `d7ac84b64e34abf7607c96b8f3cde5b0f399d6ad` / tree `cb656d509ae4cd1d2f0c2b9a2aac125ea0baf08a`.
- Main/Backend/Frontend: `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`.
- Source migrations: 68; migration69/70/71 absent.
- Main protected untracked: 80 / `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`.
- Stash: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.

## Pre-change dangling inventory

A deterministic one-shot inventory found exactly 12 missing Job ontology refs:

- Parse: `job.p08_parse.v1`, `schema.p08_parse.producer.v1`, `schema.p08_parse.validator.v1`, `schema.p08_parse.consumer.v1`.
- Commit: `job.p08_commit.v1`, `schema.p08_commit.producer.v1`, `schema.p08_commit.validator.v1`, `schema.p08_commit.consumer.v1`.
- Export: `job.p08_export.v1`, `schema.p08_export.producer.v1`, `schema.p08_export.validator.v1`, `schema.p08_export.consumer.v1`.

All were absent from the global ID index. No other Job family was registered.

## Model/schema extension

The schema/model were extended with required top-level collections:

- `jobDescriptors`
- `payloadSchemas`

Each descriptor defines ID, canonical Job type/key, version, payload wire, producer/validator/consumer schema refs, owner module, runtime boundary and description.

Each payload schema defines ID, role, descriptor ref, fields, `unknownFields: reject` and description. Fields are deterministically copied from the canonical wire shape; business fields were not changed.

Registered families only:

- `job.p08_parse.v1` ↔ `wire.p08_parse_payload`
- `job.p08_commit.v1` ↔ `wire.p08_commit_payload`
- `job.p08_export.v1` ↔ `wire.p08_export_payload`

No `totalRows`, `mode`, `querySnapshotHash` or other alias was added.

## Generator/verifier extension

- `jobDescriptors` and `payloadSchemas` were added to the global reference collections.
- Generated wire registry now includes both collections, derived from the model.
- Verifier added descriptor↔wire, descriptor↔three schemas, role, reverse reference, field isomorphism, unknown-fields rejection, cross-job and orphan checks.
- Semantic fixture gained a complete test descriptor and three test schemas.

## Gate result

- Schema validation: PASS.
- Deterministic generation: PASS, 13 artifacts.
- Byte-for-byte generator verify: PASS.
- Generated model SHA: `67abca6aa8d645760d61a1b5d6e6b61b3806eb5adc32d731fe5464dae89a5f97`.
- Schema SHA: `187f83163be51c3c543ed684a99a6d720b2bcc51ce9dde87e6e4539d5949af97`.
- Generator SHA: `2df03d8b50f4ab50e26a4d93ee4ba66063b05141b3446d0c8bae208d90c0b3bf`.
- Combined tooling suite discovered 38 tests: 18 passed / 20 failed.
- First new failure: `REFERENCE_CYCLE: wire.job`.

The cycle arises because the generic global graph treats the intentional descriptor↔wire↔schema bidirectional authority relation as a forbidden reference cycle before the dedicated Job registry checker can validate its legal closed topology. This is a tooling ontology issue, but it is a new semantic failure and is outside automatic repair under this authorization.

The positive fixture failed; the unknown Job mutation and generic dangling/reference-cycle tests reached rejection, but the remaining mutation tests were shadowed by the positive fixture cycle. Therefore the required claim that all old and new mutations execute their intended assertions cannot be made.

## Actual semantic verifier and reviews

Actual candidate semantic verification was not run after this new fixture-suite failure. No candidate manifest was accepted. Independent reviews were not started.

## Stop boundary

- Package remains `CANDIDATE — NOT AUTHORITY` and BLOCKED.
- No v1.6.
- No payload business field, SQL signature, DDL, Contract, saga, scope, Audit, privacy or rollout change.
- No product code, Prisma schema, product tests or migrations1–68 change.
- No migration69/70/71.
- No production DB, Stage C, provider or deployment.
- No Main/Backend/Frontend promotion, push/fetch/PR, stash operation, reset/rebase/force/clean or historical worktree cleanup.

`production deploy: deferred until full Dashboard completion`
