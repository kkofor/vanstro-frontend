# Integration — F1 Remediation Contract Freeze

- Coordination baseline: `d99011de5ed5faa0290ec24024b8269ad3b920e9`; product/domain baseline remains `f96bb80e9b024352408372440d803072980dbe43` until normal domain merges.
- P09 historical v1.0 remains byte-identical at `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.0-20260803.md`, SHA-256 `0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de`.
- P10 historical v1.0 remains byte-identical at `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p10-analytics-event-metric-foundation-contract-v1.0-20260803.md`, SHA-256 `c813cd83a526f669aaf39781fa35aa40b32883ffe99d21dc46d843ef868784f9`.
- New canonical P09 v1.1: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p09-runtime-config-flags-readiness-contract-v1.1-20260803.md`; FROZEN; 164 LF lines; 13667 bytes; SHA-256 `facc587a416c53e4ff385abad299d1ded5e592280d57215c8e0371be760418dd`.
- P09 v1.1 formally supersedes v1.0, accepts existing migrations65/66, and authorizes source-only migration69 for API/Worker DB-principal separation, Worker-only lifecycle connection, safe readiness observation, source-latest=69, exact grants/revokes/post-assertions, and no second lifecycle authority. Production remains41 and unauthorized.
- New canonical P10 v1.1: `/Users/zhangguannan/Documents/codex/vanstro-backups/dashboard-p10-analytics-event-metric-foundation-contract-v1.1-20260803.md`; FROZEN; 235 LF lines; 16457 bytes; SHA-256 `40fea50863beac7ef95f85f8a77dfae93ae9b728f69a5fd94c7c305e63658a78`.
- P10 v1.1 formally supersedes v1.0, accepts existing migrations67/68, and authorizes source-only migration69 for DB-owned P02 exact binding reconstruction, ingestion v3, operation-specific safe list/count/rate/readiness, k=3 primary/secondary suppression and differencing resistance, old-overload revoke, direct-table denial and post-assertions. Provider sink remains disabled; no GA4/PostHog/Search Console.
- Both Contracts authorize exactly one forward-only migration69 and explicitly prohibit migration70, Stage C, production DB access/migration, backfill, provider configuration and deployment.
- F0 remains source+checkpoint authority with no independent exact frozen Contract; P02 blocked header is historical/superseded; P07 same-path version history remains a governance defect. No historical file is rewritten by this freeze.
- Independent internal consistency/security reviews are required before Backend product changes. Any unresolved conflict leaves F1 BLOCKED.

`production deploy: deferred until full Dashboard completion`
