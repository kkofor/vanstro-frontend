#!/usr/bin/env bash
set -euo pipefail
if [[ "$(node -p 'process.versions.node.split(`.`)[0]')" != "22" ]]; then printf 'owned API harness requires Node 22\n' >&2; exit 1; fi
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
STRICT_API_ROOT="$ROOT" PATH=/opt/homebrew/opt/node@22/bin:$PATH bash "$ROOT/scripts/test-f1-migration71.sh"
printf 'owned PostgreSQL 16 full API strict-role gate passed\n'
