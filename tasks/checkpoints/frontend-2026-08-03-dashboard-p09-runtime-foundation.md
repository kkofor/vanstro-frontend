# Frontend — Dashboard P09 Runtime Config / Flags / Readiness Foundation

- Baseline `2482cc2fa95285b6a4e8024b9eb3a8746a6b76bd`; frozen Contract v1.0 SHA-256 `0732de4d3333d809d174a5b9f0efb809ebc09a3553b04bfd3c2f90133cfef4de`.
- Added canonical `/dashboard/runtime?view=config|flags|readiness` and fr-prefixed route handling under the Simplified Chinese Dashboard shell without changing Storefront EN/fr content.
- Added strict registry and response validators, exact operation-aware relative transport, actor/context fencing, Config desired/effective/source/version UI, typed forms, activation failure/retry state, Feature Flag state and independent focus-managed `KILL` confirmation, and ready/degraded/not-ready/stale dependency presentation.
- Protected deployment/provider descriptors show only safe state and never values. Arbitrary keys, URL, methods, endpoints, targeting expressions and unknown query parameters fail closed before fetch/mutation.
- The inherited F0 transport remains read-only by default; only exact P09 operations use the dedicated allowlist transport after current permission checks.
- Web TypeScript passed. Focused P09 contract/transport/panel tests: 10/10, zero fail/skip.
- Full package/static/browser gates remain Integration work. No production action, deployment, provider/storage configuration, migration or P10 occurred.

`production deploy: deferred until full Dashboard completion`
