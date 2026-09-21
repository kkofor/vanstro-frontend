# Integration — F1 Contract Authority Package v1.2 BLOCKED

## Conclusion

The v1.2 authority-package work unit stopped after both independent review dimensions rejected the candidate package. No package file is FROZEN or current authority. No product code or migration changed; migration69/70 do not exist.

## Authorization and baseline

- Authorization: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-contract-authority-package-v12-coordinator-prompt.md`; 410 LF lines; 21421 bytes; SHA `8d56400089bbd8442cca2bbee3216a25048b4a0a34fd95f9997798d1b0419c2f`.
- Integration start/head: `56fb21eb3a49cf52104a77ca2906cc15c40c36c8`; Main/Backend/Frontend product baseline `f96bb80e9b024352408372440d803072980dbe43`.
- P09/P10 v1.0 and rejected v1.1 bytes matched expected identities; migrations1–68 matched the pre-package manifest; migration69 absent.

## Rejected candidate package identities

- P09 v1.2: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.2-20260803.md`; 85 lines / 6453 bytes / SHA `21c0b1e074b6890dd6773808255660603409f409b09a1da19924b99bb63bdd82`.
- P10 v1.2: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p10-analytics-event-metric-foundation-contract-v1.2-20260803.md`; 90 lines / 10900 bytes / SHA `039cb6891069bf9eca242e100eb45adb61646917db6782a18157aefa5feb0d43`.
- P04 erratum: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p04-exact-replay-legacy-audit-erratum-v1.1-20260803.md`; 79 / 5589 / `b14f35a9a53ea57bb6b0333606d50afd3dcbdd58e86c753f2cb894e35ba513ee`.
- P05/P08 joint erratum: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p05-p08-source-artifact-job-payload-upload-token-joint-erratum-v1.0-20260803.md`; 66 / 7905 / `e6491fc6f496b1bc0ae1c65e3212bbf2cc9760cf5f3a887e95c50422045799b3`.
- P02 clarification: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p02-current-context-authority-clarification-v1.0-20260803.md`; 94 / 6298 / `f575655c4a735bbaca6bdd94bd570881fc15a085a2a72fd225a825693dd57894`.
- Unified ledger: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-f1-unified-migration69-authority-ledger-v1.0-20260803.md`; 163 / 15979 / `0dc4189a57cba7f134a4069c482e2aefc2d9b1a2622a05cc48f8709d97c09455`.
- Package manifest: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-f1-contract-authority-package-manifest-v1.0-20260803.md`; 44 / 4270 / `b76657cf85568bbe2f8c9305941983d71b903d7557c03dddb443d418417adbd6`.

All seven are marked `REJECTED CANDIDATE — NOT AUTHORITY`. Their manifest's earlier candidate hashes are historical and not a valid final package root.

## Independent review results

### Contract/architecture dimension

Result: no approval; 4 High and 3 Medium. Key High findings:

1. The P10 release timing originally made releases unreachable; later candidate edits attempted to change this, invalidating reviewed hashes and requiring review restart.
2. P09 typed Audit lifecycle lacked an exact closed action/result/reason registry compatible with P04.
3. Distinct-subject identity lacked a frozen stable identity/rotation rule; later edits chose an unkeyed actor digest but were not reviewed as a stable package.
4. Manifest did not independently preserve/reproduce the authorization artifact and did not self-authenticate the seven-file membership.

### Security/privacy/database dimension

Result: no approval; 3 Blocker, 4 High, 4 Medium (with additional implementation cross-check findings). Principal blockers/highs:

1. The package delegated exact SECURITY DEFINER SQL signatures to a future implementation Contract, creating a second authority.
2. Manifest did not reproducibly authenticate its own seven-file package root.
3. P02 persisted-authority helper lacked exact resource identity/binding in its proposed interface.
4. P09 detailed readiness observation bypassed per-request P02 current-context if granted generically to runtime.
5. Deterministic k=3 threshold is a membership oracle and is not differential privacy; package must explicitly bound its threat model or authorize a separate privacy-budget authority.
6. P08 broken-batch terminal disposition was not singular and self-contained.
7. P08 payload contradicted frozen P08's required `binding_hash` and expected-status binding; joint erratum was merely “related” rather than an explicit narrow supersession.
8. P05 source-Artifact exception did not explicitly supersede the exact P05 Worker-only creation clause.
9. Token KID/version metadata was mandatory in one artifact but conditional in the ledger.
10. P04 replay required original success Audit ID without freezing a unique fact→Audit identity/constraint.
11. Conditional DDL gates were subjective, allowing multiple different migration69s.
12. Online expand/contract safety requires migration70 or an explicitly authorized maintenance outage; the package prohibited both. A single migration69 cannot safely create new entrypoints and revoke entrypoints still used by deployed code.
13. Upgrade matrix omitted production baseline `41→69` and key `63/65` boundaries.

## Required next authority decision

A future package must resolve, before another review:

- exact full PostgreSQL signatures/owners/callers/returns/old overloads in the package itself;
- a reproducible non-recursive seven-file package root and immutable authorization artifact;
- exact resource-bound persisted-authority helper serialization/digest with golden vectors;
- P09 exact Audit registry and per-request detailed-readiness authorization;
- explicit P05 and P08 supersession wording, exact bindingHash payloads, singular broken-batch transition, mandatory/absent conditional DDL decisions;
- P04 fact→success-Audit unique identity;
- privacy threat model and release model;
- online rollout: either authorize migration70 expand-contract or explicitly authorize/quantify an outage and prove one-migration safety;
- upgrade paths including production baseline41 and significant 63/65 boundaries.

## Stop boundary

- No FROZEN package or docs-only freeze/evidence commit was created.
- No product code changed; no migration69/70 created.
- No production DB access/migration/backfill, credential provisioning, provider, GA4/PostHog/Search Console, deployment or Stage C.

`production deploy: deferred until full Dashboard completion`
