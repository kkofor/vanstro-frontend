# Integration — F1 v1.5 Wire-Model Correction BLOCKED

## Conclusion

The authorized finite ontology correction removed the original `WIRE_SQL_RETURN_MISMATCH: wire.p08_parse_payload` root cause by separating Job payload and SQL-return wire kinds. The correction then stopped at the first new gate failure, as required:

```text
DANGLING_REFERENCE: wire.job -> job.test.v1
```

This new failure occurred in the semantic positive/mutation test gate before actual-candidate semantic verification. No further automatic modification was made. Independent reviews were not started because semantic verification did not fully pass.

## Authorization and baseline

- Prompt: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-v15-wire-model-correction-coordinator-prompt.md`
- Identity: 108 LF lines / 6006 bytes / SHA `901eb432057b1b1bcf0622799342023c126669ded938c17520d1b5f88a495e81`.
- Integration start: `0a1729b953ad388094763a12c9f387a23391af71` / tree `f6e1b07f973a83dbb43653950d37aec2aea12e40`.
- Main/Backend/Frontend: `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`.
- Source migrations: 68; migration69/70/71 absent.
- Main protected untracked: 80 / `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`.
- Stash: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.

## Original root cause and ontology correction

Original model error:

- `wire.p08_parse_payload` is a Job payload with fields `importId`, `artifactId`, `expectedVersion`, `scopeFingerprint`.
- It was incorrectly bound to `function.p08_finalize_import_source_v2` as though it were that function's SQL return wire.

The finite correction introduced closed wire kinds:

- `job_payload`
- `sql_return`
- `api_request`
- `api_response`
- `safe_projection`

Binding rules:

| Kind | Required authority | Forbidden binding |
|---|---|---|
| `job_payload` | Job descriptor plus producer/validator/consumer schema IDs | SQL return function |
| `sql_return` | Exact SQL function | Job descriptor/schema trio |
| `api_request` / `api_response` | Route/operation authority | SQL-return substitution |
| `safe_projection` | Projection authority | SQL-return substitution |

`wire.p08_parse_payload` remains `job_payload` and now carries Job descriptor plus producer/validator/consumer schema identities. A separate `wire.p08_finalize_import_source_sql_return` is derived from the function's seven actual return fields.

Other existing Job payload wires were classified as `job_payload`; readiness and release response wires were classified as `sql_return`. No business field, function signature, DDL, storage saga, permission, scope, Audit, privacy or rollout target was changed.

## Modified source identities

- `authority-model.yaml`: 6766 lines / 195395 bytes / SHA `d11892d69a1728969f47465f970825244535fbb4badc58b5377b8528387666b1`.
- `authority-model.schema.json`: 1683 lines / 34577 bytes / SHA `4d18505616eaa2608c61031677ff085354f55aa4ef6abe3fbddc23f07e8de6b1`.
- `qa/scripts/f1-v15-generate.mjs`: 369 lines / 18520 bytes / SHA `3396025619dad13a311e8dc0d0760cc2c343ec23a3ea517a65b8e3194ff39ce1`.
- `qa/scripts/f1-v15-semantic-verify.mjs`: 401 lines / 21098 bytes / SHA `5fe1dad96a3490e467a73dd70a9b1a443b3b1febec9d042b3d9ce4f9d450bd38`.
- `qa/f1-v15-authority.test.mjs`: 155 lines / 14114 bytes / SHA `cadb5e7a0528b050684fb96e2bdaed1c15222660abdc6b8f98ac37b2a2d981db`.

The generator itself required no ontology code change; model/schema/verifier/tests changed. Generated artifacts were regenerated deterministically from the revised model.

## Added mutation coverage

Added tests require:

1. Job payload bound to SQL return → fail.
2. SQL return field mismatch → fail.
3. Producer/validator/consumer payload mismatch → fail.
4. Correct Job payload binding → positive fixture path.

The first combined rerun reported 17 pass / 20 fail because the positive fixture's new Job authority IDs were not members of the global reference index. The first complete new error is:

```text
DANGLING_REFERENCE: wire.job -> job.test.v1
```

All later mutation failures in that run were downstream of this same positive-fixture dangling reference. Per authorization rule 22, it was not automatically repaired and the actual candidate semantic verifier was not run after this new failure.

## Gate results

- Schema validation: PASS.
- Generate: PASS, 13 derived artifacts.
- Generator byte-for-byte verify: PASS.
- New model SHA: `d11892d69a1728969f47465f970825244535fbb4badc58b5377b8528387666b1`.
- New schema SHA: `4d18505616eaa2608c61031677ff085354f55aa4ef6abe3fbddc23f07e8de6b1`.
- Generator SHA: `3396025619dad13a311e8dc0d0760cc2c343ec23a3ea517a65b8e3194ff39ce1`.
- Baseline SHA: `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`.
- Manifest helper tests in combined run: PASS.
- Baseline extractor tests in combined run: PASS.
- Semantic positive/mutation tests: BLOCKED by `DANGLING_REFERENCE: wire.job -> job.test.v1`.
- Actual candidate semantic verifier: not rerun after the new failure.
- New candidate manifest: not accepted/authenticated.
- Independent reviews: not started.

## Stop boundary

- Package remains `CANDIDATE — NOT AUTHORITY` and BLOCKED.
- No v1.6.
- No product code, Prisma schema, product tests or migrations1–68 changes.
- No migration69/70/71.
- No production DB, Stage C, provider or deployment.
- No Main/Backend/Frontend promotion, push/fetch/PR, stash operation, reset/rebase/force/clean or historical worktree cleanup.

`production deploy: deferred until full Dashboard completion`
