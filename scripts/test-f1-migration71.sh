#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'F1 migration71 requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
AUTH="$ROOT/tasks/tooling/f1-v15-clarification"
M69="$ROOT/packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql"
M70="$ROOT/packages/db/prisma/migrations/20260804110000_f1_v15_phase_b/migration.sql"
M71="$ROOT/packages/db/prisma/migrations/20260804120000_f1_v15_compatibility_closure/migration.sql"
M72="$ROOT/packages/db/prisma/migrations/20260804130000_f1_v15_runtime_acl_closure/migration.sql"
FROZEN_HARNESS="$AUTH/owned-pg16-conformance.mjs"
BOOTSTRAP="$AUTH/11-privileged-bootstrap-authority.sql"
CONCURRENT="$AUTH/12-migration69-concurrent-indexes.sql"
check_sha(){ [[ "$(shasum -a 256 "$1" | cut -d' ' -f1)" == "$2" ]] || { echo "$3 drifted" >&2; exit 1; }; }
check_sha "$M69" 07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051 migration69
check_sha "$M70" 93e3657383c8d1f9ae023cdcd1344a33cf49090444dcbbcdabe2ab3e0d525288 migration70
check_sha "$FROZEN_HARNESS" 9121bc6bc09c8d08cb333cc4045b99103ff440e628a75c01a3295861f979d479 frozen-owned-harness
check_sha "$BOOTSTRAP" ba1abd28baf93a1764f6db82bc46c3be7c4e98cc1fb7d1af98f88b6c230a4a5e privileged-bootstrap
check_sha "$CONCURRENT" 5ba01f63f0ab152c3c4e721d45d29582ca669703c00004fc949090de1d2e45d7 migration69-concurrent-phase
[[ "$(find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" == 81 ]] || { echo 'source migration count is not 81' >&2; exit 1; }
node --experimental-strip-types --test "$ROOT/scripts/f1-migration72-functional.test.mjs"
T=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-f1-m71-root.XXXXXX")
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/packages/db/prisma/migrations"
find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -print | LC_ALL=C sort | while read -r directory; do
  [[ "$(basename "$directory")" < "20260804100000_f1_v15_expand" ]] || continue
  cp -R "$directory" "$T/packages/db/prisma/migrations/"
done
HARNESS_ARGS=(
  --root "$T"
  --sql "$M69"
  --old68 "$AUTH/03-old68-runtime-surface.json"
  --migration70 "$M70"
  --migration71 "$M71"
  --migration72 "$M72"
  --bootstrap "$BOOTSTRAP"
  --concurrent "$CONCURRENT"
)
if [[ -n "${STRICT_API_ROOT:-}" ]]; then HARNESS_ARGS+=(--strictApiRoot "$STRICT_API_ROOT"); fi
node "$ROOT/scripts/f1-migration71-owned-pg16.mjs" "${HARNESS_ARGS[@]}"
