#!/usr/bin/env bash
set -euo pipefail
[[ "$(node -p 'process.versions.node.split(`.`)[0]')" == 22 ]] || { echo 'F1 migration69 requires Node22' >&2; exit 1; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
AUTH="$ROOT/tasks/tooling/f1-v15-clarification/v1.0.1-migration69-authority"
M69="$ROOT/packages/db/prisma/migrations/20260804100000_f1_v15_expand/migration.sql"
cmp -s "$M69" "$AUTH/generated/09-migration69-executable-authority.sql" || { echo 'migration69 authority bytes drifted' >&2; exit 1; }
[[ "$(shasum -a 256 "$M69" | cut -d' ' -f1)" == 07c2591b57b27f08573348e3601601c2dc0ecc74e61f8ba27d29d3258231d051 ]] || { echo 'migration69 sha drifted' >&2; exit 1; }
[[ "$(find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" == 81 ]] || { echo 'source migration count is not 81' >&2; exit 1; }
[[ "$(grep -F 'SOURCE_LATEST_MIGRATION_NUMBER = 73' "$ROOT/packages/db/src/generated/source-latest-migration.ts" | wc -l | tr -d ' ')" == 1 ]] || { echo 'source-latest number drifted' >&2; exit 1; }
T=$(mktemp -d "${TMPDIR:-/tmp}/vanstro-f1-root.XXXXXX")
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/packages/db/prisma/migrations"
find "$ROOT/packages/db/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -print | LC_ALL=C sort | while read -r d; do [[ "$(basename "$d")" < "20260804100000_f1_v15_expand" ]] || continue; cp -R "$d" "$T/packages/db/prisma/migrations/"; done
node "$AUTH/tooling/owned-pg16-conformance.mjs" \
  --root "$T" \
  --sql "$AUTH/generated/09-migration69-executable-authority.sql" \
  --old68 "$AUTH/generated/03-old68-runtime-surface.json" \
  --migration70 "$AUTH/generated/10-migration70-executable-authority.sql" \
  --bootstrap "$AUTH/generated/11-privileged-bootstrap-authority.sql" \
  --concurrent "$AUTH/generated/12-migration69-concurrent-indexes.sql"
