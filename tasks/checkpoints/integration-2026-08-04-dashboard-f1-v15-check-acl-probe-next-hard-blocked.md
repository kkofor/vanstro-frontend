# Integration — F1 v1.5 Exact CHECK/ACL/Probe Closed; Next HARD BLOCKED

## Conclusion

The authorized Exact CHECK / ACL / Owned Probe decision was encoded into the v1.5 machine source and verified. Five exact predicates, public-schema ACL architecture, object owner/privilege matrices, phase-specific GRANT/REVOKE operations, and a deterministic owned PostgreSQL 16 probe were added. Continuous Goal gates passed for the stable 24-member candidate.

The final Contract/architecture/rollout review found the next genuine hard conflict:

> The migration69 replacement P08 source-state CHECK rejects a legal cancel performed by the preserved old68 `p08_transition_import`, contradicting `old68 + schema69 = operational`.

The Security/privacy/database review found no other Blocker/High. The package remains `CANDIDATE — NOT AUTHORITY`; it is not FROZEN.

## Authorization

- Decision: `/Users/zhangguannan/Documents/AI_OS/projects/vanstro/tasks/plans/f1-v15-exact-check-acl-owned-probe-decision.md`
- Identity: 415 LF lines / 18253 bytes / SHA `85b59d06a83d98a819b012afa3da6ce385be6a23469f769cfc79742cc7755da1`.
- Continuous Goal: SHA `c1d71c2d867560859672b5665df200f05a80ac726de25b881e26c798755f0cfc`.
- Integration start: `14ad0d915b8ed6bea0bc9806e709a33c5e6c5171` / tree `12fd7a89838323892800c29cdab34c7a72f3259f`.

## Exact CHECK closure

All model constraints of kind `check` now carry:

- executable `sqlPredicate`;
- predicate SHA-256;
- allowed/rejected tuple vectors;
- explicit registered column validation;
- `IS TRUE` three-valued-logic closure.

The five decision predicates were copied exactly into the machine source:

1. P08 source-state;
2. P08 token v2;
3. P08 Export binding;
4. P10 release-state;
5. P10 release-cell privacy.

The model also adds the required non-null `lateExcludedCount integer default 0` future migration69 column.

## ACL closure

The model now fixes:

- existing and new Foundation objects remain in `public`;
- PUBLIC/runtime/Worker/guard roles have no schema CREATE;
- migrator owns tables, sequences, constraints, indexes and triggers;
- guard roles own only SECURITY DEFINER functions;
- `role.p10_guard_owner` is included;
- function callers and phase grants are bidirectionally equal;
- PUBLIC function EXECUTE is false;
- runtime/Worker direct CRUD is absent;
- table ACL entries are per role/per verb;
- default privileges grant nothing automatically to PUBLIC/runtime;
- Worker lifecycle has one NOINHERIT membership and explicit SET ROLE/RESET ROLE boundary;
- migration69/70 operations contain exact object-bound GRANT/REVOKE statements.

## Owned PostgreSQL 16 probe

An owned disposable PostgreSQL 16.14 container applied migrations1–68 and emitted canonical JSON for:

- overloads: 31 rows;
- migration checksums: 68 rows;
- owners: 132 rows;
- memberships: 9 rows;
- effective privileges: 3654 rows;
- unresolved owned-probe facts: 0.

Evidence:

- `source/owned-pg16-probe.json`
- SHA `53e677f4ffb3994479dee969226b1e634ccf29cef9fcfa5f20069f9e275ba416`
- Probe script is a manifest member.
- Evidence is explicitly owned/disposable, not production evidence.

## Stable reviewed candidate

Final common review target:

- 24-member manifest: `756b0483a429d8a4717fe63d92b1d39c0a41c72554d06c357c04f3c5843f34b8`
- Manifest: 24/24 verified
- Manifest-bound tests: 51/51 passed
- Semantic/generated-byte verifier: passed, 445 objects
- Owned probe: bound and no unresolved facts

## Next hard conflict

Current authority requires migration69 to install this source-state behavior:

- `cancelled|expired` ⇒ no `sourceArtifactId`, token consumed.

It also requires `old68 + schema69 = operational` and keeps the old overload until migration70.

Migration64's preserved `p08_transition_import` permits cancel from `uploaded|commit_queued` and executes:

```sql
"sourceArtifactId" = COALESCE(source_artifact_id, "sourceArtifactId")
```

A normal cancel supplies no replacement Artifact ID, so the existing source Artifact remains non-null. The migration69 replacement CHECK then rejects the UPDATE. `NOT VALID` does not help because PostgreSQL enforces it for new/updated rows.

## User decision required

At least four materially different safe directions exist:

1. **Recommended:** use a compatibility predicate in migration69 that allows source-bound cancelled rows written by old68, then install the strict no-Artifact cancelled predicate in migration70 after old-instance drain.
2. Install the strict predicate in migration69 and replace the old function body so cancel clears the Artifact binding; this changes old code behavior under schema69.
3. Move the entire replacement CHECK to migration70; schema69 would not enforce the new invariant.
4. Require old-instance drain/maintenance before installing the strict CHECK; this abandons rolling `old68 + 69` compatibility.

The decision changes rollout compatibility, data retention and the migration69/70 boundary, so it cannot be selected silently under the current authority.

## Final review result

- Contract/architecture/rollout: one Blocker — old68 cancel versus strict migration69 CHECK.
- Security/privacy/database: no reproducible Blocker/High.
- FROZEN: prohibited.

## Boundaries preserved

- No product code, Prisma schema, product tests or migrations1–68 changed.
- No migration69/70/71 created.
- No production database accessed.
- No Main/Backend/Frontend promotion.
- No Stage C, provider, GA4/PostHog/Search Console, backfill or deployment.
- No push/fetch/PR, stash, reset/rebase/force/clean or historical worktree cleanup.

`production deploy: deferred until full Dashboard completion`
