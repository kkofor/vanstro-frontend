#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TOKEN_RUNNER="$ROOT/qa/v11-auth-browser/run-v11-token-resume.sh"
AUTH_RUNNER="$ROOT/qa/v11-auth-browser/run-v11-auth.sh"
TOTAL_RUNNER="$ROOT/qa/v11-auth-browser/run-v11-total-gate.py"
TMP=$(mktemp -d)
CURRENT_CONTAINER=""
cleanup() {
  if [[ -n "$CURRENT_CONTAINER" ]]; then docker rm -f -v "$CURRENT_CONTAINER" >/dev/null 2>&1 || true; fi
  rm -rf "$TMP"
}
trap cleanup EXIT

docker volume ls -q | sort > "$TMP/volumes-before"
assert_fixture_gone() {
  local name=$1
  if docker inspect "$name" >/dev/null 2>&1; then
    printf 'fixture container leaked: %s\n' "$name" >&2
    return 1
  fi
}
assert_volume_set_unchanged() {
  local after="$TMP/volumes-after"
  for _ in $(seq 1 50); do
    docker volume ls -q | sort > "$after"
    if cmp -s "$TMP/volumes-before" "$after"; then return 0; fi
    sleep .2
  done
  printf 'Docker volume set changed; new IDs:\n' >&2
  comm -13 "$TMP/volumes-before" "$after" >&2 || true
  return 1
}
run_direct() {
  local runner=$1 scenario=$2 expected=$3
  local name="vanstro-v11-volume-${scenario}-${$}"
  set +e
  V11_POSTGRES_CONTAINER="$name" V11_CONTAINER_CLEANUP_PROBE="$scenario" V11_BROWSER_OUT="$TMP/evidence-$scenario" bash "$runner" >"$TMP/$scenario.log" 2>&1
  local status=$?
  set -e
  if [[ "$status" -ne "$expected" ]]; then
    printf '%s: expected exit %s, got %s\n' "$scenario" "$expected" "$status" >&2
    cat "$TMP/$scenario.log" >&2
    return 1
  fi
  assert_fixture_gone "$name"; assert_volume_set_unchanged; CURRENT_CONTAINER=""
  printf '%s: exit=%s container=absent volumeDelta=0\n' "$scenario" "$status"
}
run_total_signal() {
  local sig=$1 expected=$2 lower
  lower=$(printf '%s' "$sig" | tr '[:upper:]' '[:lower:]')
  local name="vanstro-v11-volume-${lower}-${$}"
  local out="$TMP/total-$lower" log="$TMP/total-$lower.log"
  CURRENT_CONTAINER=$name
  V11_QUARANTINE_RUNTIME_ENV=true V11_POSTGRES_CONTAINER="$name" V11_CONTAINER_CLEANUP_PROBE=wait V11_BROWSER_OUT="$out" python3 "$TOTAL_RUNNER" >"$log" 2>&1 &
  local pid=$! ready=false
  for _ in $(seq 1 600); do
    if docker inspect "$name" >/dev/null 2>&1; then ready=true; break; fi
    if ! kill -0 "$pid" >/dev/null 2>&1; then break; fi
    sleep .1
  done
  if [[ "$ready" != true ]]; then
    wait "$pid" || true
    printf '%s: total runner never started fixture\n' "$sig" >&2
    cat "$log" >&2
    return 1
  fi
  kill -s "$sig" "$pid"
  set +e; wait "$pid"; local status=$?; set -e
  if [[ "$status" -ne "$expected" ]]; then
    printf '%s: expected exit %s, got %s\n' "$sig" "$expected" "$status" >&2
    cat "$log" >&2
    return 1
  fi
  assert_fixture_gone "$name"; assert_volume_set_unchanged; CURRENT_CONTAINER=""
  printf '%s: exit=%s child-forwarded container=absent volumeDelta=0\n' "$sig" "$status"
}

run_direct "$TOKEN_RUNNER" success 0
run_direct "$TOKEN_RUNNER" nonzero 42
run_direct "$TOKEN_RUNNER" ready-failure 1
run_direct "$AUTH_RUNNER" success 0
run_total_signal INT 130
run_total_signal TERM 143
printf 'V11 anonymous-volume cleanup regression PASS\n'
