# Integration — F1 Contract Authority Package v1.5 BLOCKED

## Conclusion

The v1.5 single-machine-source work unit stopped before independent reviews because the mandatory semantic verifier failed on the generated candidate:

`WIRE_SQL_RETURN_MISMATCH: wire.p08_parse_payload`

Per authorization gate 107, any schema/generator/manifest/semantic failure immediately leaves the package BLOCKED and independent reviews must not start. The model remains `CANDIDATE — NOT AUTHORITY`; no FROZEN or review-approved package exists.

## Authorization and baseline

- Prompt: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-authority-package-v15-machine-source-coordinator-prompt.md`
- Identity: 324 LF lines / 20248 bytes / SHA `bffffa9f15b1c60dc37fa5a2b45214d056d35a46c9681862507a99e897eba70d`.
- Integration start: `bd0cf763168ff1d56824ab0d1196e6663625eafe` / tree `0f14b9dda4940f47cf0dae2d1671d890f3251ae6`.
- Main/Backend/Frontend: `f96bb80e9b024352408372440d803072980dbe43` / tree `6dff603c17df85a1451db68733b27ad0b658aba6`.
- Source migrations: 68 / inventory SHA `c6cf97a80cdfe6032068af11d13ca54b16cec9b88ce23ff9454f0689501935a3`.
- migration69/70/71: absent.
- Main protected untracked: 80 / `ce73d578710bc83048252feadaf8fc81c0eb397cbd648985f0b40fbcc9503c6e`.
- Stash: `23fc05dc7c8106f11f248f01b5fbafbe38e3477f`.
- Rejected v1.1–v1.4 remained byte-identical and were not revived.

## Single source and schema

Root: `/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.5-20260804/source`

- `authority-model.yaml`: JSON-compatible YAML 1.2, 6691 lines / 192612 bytes / SHA `54bdbb29dcf834f1d20c4b1db9a69ab55a3c24ca92d9ca4f1f6ffc4e6e9a99a5`; status `CANDIDATE — NOT AUTHORITY`.
- `authority-model.schema.json`: 165 lines / 20049 bytes / SHA `fa8f53887c7d308e0359731c7ff59f32a58593a6c5d6e61d8b968efdf70f4a2f`.
- `baseline-physical-inventory.json`: 47655 lines / 1788705 bytes / SHA `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`.

The baseline extractor records source path, lines and SHA provenance and marks catalog/runtime facts that source cannot prove as `unknown_requires_owned_probe`. It did not access a database.

## Tooling identities

- `qa/scripts/f1-v15-extract-baseline.mjs`: 249 lines / 18842 bytes / SHA `95907fe74bb82eb5a2439cd1ca1adc92e6d5f6e24ef4bc1a9673bb3cbf2199b5`.
- `qa/f1-v15-extract-baseline.test.mjs`: 108 lines / 5654 bytes / SHA `17b8ff5d0cef4944bf35e4c14222da1dc469650e4471184c6c191f22d498573d`.
- `qa/scripts/f1-v15-generate.mjs`: 369 lines / 18520 bytes / SHA `3396025619dad13a311e8dc0d0760cc2c343ec23a3ea517a65b8e3194ff39ce1`.
- `qa/scripts/f1-v15-semantic-verify.mjs`: 388 lines / 19982 bytes / SHA `dbf3256511ead45c4ac1d3619b46bffc74b63277785d06ecb6332e4647255d62`.
- `qa/f1-v15-authority.test.mjs`: 152 lines / 12925 bytes / SHA `b78adf730fbe8955663e2719643adf54c9f93b3abd1bfe41e129d744ba46be47`.

## Generated candidate

The deterministic generator passed schema validation and generated 13 artifacts under:

`/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.5-20260804/generated`

Generated artifacts include P02/P04/P05-P08/P09/P10 Contracts, migrations69–70 ledger, closed SQL catalog, physical inventory, wire registry, permission/action/reason registry, rollout matrix, review checklist and manifest staging. Every generated file is derived from the model; none is an independently maintained authority.

Generation evidence:

- generatedCount: 13
- model SHA: `54bdbb29dcf834f1d20c4b1db9a69ab55a3c24ca92d9ca4f1f6ffc4e6e9a99a5`
- schema SHA: `fa8f53887c7d308e0359731c7ff59f32a58593a6c5d6e61d8b968efdf70f4a2f`
- baseline SHA: `bfa3a3e2f0ec6a40cd09dd0cccb7ebeb9fa655856f3a9586d172cfd0a95abcfc`
- generator SHA: `3396025619dad13a311e8dc0d0760cc2c343ec23a3ea517a65b8e3194ff39ce1`
- generate mode: PASS
- byte-for-byte verify mode: PASS

No externally authenticated candidate manifest was accepted because semantic verification failed first.

## Semantic verification result

The verifier progressed through schema, identity, refs, baseline, physical closure and migration revoke checks, then failed at the required Contract/wire/SQL-return isomorphism gate:

```text
WIRE_SQL_RETURN_MISMATCH: wire.p08_parse_payload
```

The model binds `wire.p08_parse_payload` to `function.p08_finalize_import_source_v2`, but the Job payload fields (`importId`, `artifactId`, `expectedVersion`, `scopeFingerprint`) do not equal that SQL function's return fields. Therefore the current model does not define one machine-consistent wire-to-SQL mapping. This is a real authority-model defect, not a generator nondeterminism.

The semantic verifier and mutation suite itself passed its synthetic positive/mutation tests after tooling alignment: 20/20. Baseline extractor tests passed 6/6 and existing manifest tests passed 8/8 when run separately. The actual v1.5 model still fails the semantic gate above, so those tooling tests cannot certify this package.

## v1.4 Blocker treatment in the model

The model attempts to centralize and generate:

- fixed package members and object closure;
- one role/function/table/index/trigger/wire definition per ID;
- P08 state/saga/orphan/token/payload/query authority;
- P04 fact→Audit mapping;
- P02 resource resolver and HMAC vectors;
- P09 roles/Audit/readiness/source-latest;
- P10 consent/release/cell/suppression/cleanup/wire;
- 69/70 phases and complete upgrade matrix;
- suppressed release numeric fields as NULL;
- mutation tests for v1.4 findings.

However, because the actual model's P08 wire/function mapping fails, v1.4 physical drift is not fully closed.

## Reviews

No independent Review A or Review B was started. Authorization gate 107 explicitly requires schema, generator reproducibility, manifest and semantic verifier to pass before review. Reporting zero reviews as a failure is intentional and honest; no review conclusion can be reused from v1.4 or inferred.

## Stop boundary

- No FROZEN package or freeze commit.
- No product, Prisma schema, product test or migrations1–68 changes.
- No migration69/70/71.
- No production DB, credential, provider, GA4, PostHog, Search Console, backfill, deployment, DNS/TLS or Stage C.
- No Main/Backend/Frontend promotion, push/fetch/PR, stash operation, reset/rebase/force/clean or historical worktree cleanup.

`production deploy: deferred until full Dashboard completion`
