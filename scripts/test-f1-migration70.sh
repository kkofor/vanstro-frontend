#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'F1 migration70 requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# Functional-first M70 byte authority: migration69 stays owned by the v1.0.1
# successor package; migration70 is owned by the v1.0.3 functional-first
# successor package and must be BYTE-IDENTICAL to its generated executable
# authority (no re-wrapping). The A+ multi-role ACL conformance harness is
# deliberately NOT part of this gate — the functional-first contract keeps
# old-entry privileges and does not require the A+ closed set; the real
# prisma migrate deploy dual-topology run is the functional evidence.
AUTH_69="$ROOT/tasks/tooling/f1-v15-clarification/v1.0.1-migration69-authority"
AUTH_70="$ROOT/tasks/tooling/f1-v15-clarification/v1.0.3-migration70-authority"
M69="$ROOT/packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql"
M70="$ROOT/packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql"
cmp -s "$M69" "$AUTH_69/generated/09-migration69-executable-authority.sql" || { echo 'migration69 authority bytes drifted' >&2; exit 1; }
[[ "$(shasum -a 256 "$M69" | cut -d' ' -f1)" == 07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051 ]] || { echo 'migration69 drifted' >&2; exit 1; }
# migration70 must be byte-identical to the v1.0.3 generated authority
cmp -s "$M70" "$AUTH_70/generated/10-migration70-executable-authority.sql" || { echo 'migration70 authority bytes drifted' >&2; exit 1; }
[[ "$(shasum -a 256 "$M70" | cut -d' ' -f1)" == 93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288 ]] || { echo 'migration70 drifted' >&2; exit 1; }
[[ "$(find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" == 81 ]] || { echo 'source migration count is not 81' >&2; exit 1; }
node --test "$ROOT/scripts/f1-migration70-static.test.mjs"
