#!/usr/bin/env bash
# =============================================================================
# V11-R1 P7 — disposable PG16 `prisma migrate deploy` drill.
#
# Proves, with the REAL prisma migrate deploy runner (no db push, no manual
# _prisma_migrations seeding), on two INDEPENDENT disposable postgres:16
# containers in one run:
#   * fresh topology:         deploy 1..69, then STOP at migration 70
#   * production topology:    baseline deploy 1..41, then continue 42..69,
#                             then STOP at migration 70
#
# The deterministic failure points are exercised in order:
#   pass 1 fails at migration 69 (f1_v15_expand)  — external manifest/audit
#     tables + bootstrap roles absent → resolve --rolled-back → provision →
#     the new69 diagnostic then MUST succeed with 0 ACL warnings (exit 0,
#     stderr 'no privileges could be revoked'/'no privileges were granted'
#     count = 0) →
#   pass 2 fails at migration 70 (f1_v15_phase_b) — migration 69 has been
#     applied (applied=69), so the deploy stops at 70 only because the
#     attestation/telemetry fixture is absent → resolve --rolled-back →
#   pass 3 fails at migration 70 AGAIN with applied=69: the fixture stays
#     intentionally absent, so the blocker reproduces deterministically.
#     This is the EXPECTED_BLOCKED_M70 evidence: both paths end with
#     applied=69 / failed=migration70 and the SAME pass3 first error
#     (SQLSTATE + statement signature). Crossing migration 70 in pass3
#     (rc=0 or applied>69) is ALWAYS FAIL — the blocker was not reproduced.
# Failed migrations are resolved ONLY with `prisma migrate resolve
# --rolled-back` (never --applied).
#
# OUT-OF-MIGRATION ADMIN CONTRACT (each block below is annotated with WHY it
# cannot be a prisma migration — the migrations themselves assert these
# preconditions as *prior state*, see migration 59's own comment "Role
# provisioning is an out-of-migration admin action" and migration 69's
# precondition DO blocks):
#
#   A. ROLE TOPOLOGY — migrations run AS vanstro_migrator; a migration cannot
#      bootstrap the very principals it then executes as, and migration 59
#      asserts exact role attributes + no membership path for runtime.
#      Memberships carry ADMIN OPTION because migration 69 (running as
#      migrator) GRANTs the cap roles to the runtime principals and migration
#      59 requires migrator to be MEMBER of vanstro_media_guard_owner.
#   B. OWNERSHIP — migration 59/69 REVOKE and ALTER OWNER; migrator must own
#      the database (extension + login rights) and the public schema (REVOKE
#      CREATE) before the first migration runs.
#   C. CREATE REVOCATION — migration 59 ASSERTS PUBLIC/vanstro_runtime already
#      lack CREATE on database and public schema before it (re-)revokes them;
#      migration 69 extends the revoke to vanstro_worker_runtime.
#   D. EXTENSIONS — pgcrypto (used by preset verifier functions; no migration
#      installs it) and pg_trgm (migration 19 uses IF NOT EXISTS) are platform
#      packages, installed by the operator, not schema.
#   E. CRYPTO VERIFIER PRESET — migration 70 invokes
#      vanstro_verify_ed25519_v1 at deploy time and migrations 69/70 ship
#      SECURITY DEFINER functions whose bodies reference the external verifier
#      and erasure-HMAC functions; these live outside the migration tree by
#      design (the migration SQL must not carry platform keys).
#   F. ALTER DATABASE GUCs — migration 70 reads vanstro.rollout_id /
#      vanstro.environment / vanstro.manifest_digest via current_setting() on
#      every deploy connection; only ALTER DATABASE persists custom GUCs for
#      connections the migration runner opens.
#   G. 68-ROW SOURCE MANIFEST + BOOTSTRAP AUDIT — migration 69 asserts the
#      manifest's exact 68 (name, checksum) rows and ALTERs the OWNER of both
#      tables to vanstro_migrator, which requires migrator to ALREADY own them:
#      they are therefore created AS vanstro_migrator before migration 69.
#   H. ATTESTATION/TELEMETRY FIXTURE (intentionally ABSENT) — migration 70's
#      f1_consume_no_old_instances_v2 consumes a signed deployment attestation
#      + exactly 31 old68 telemetry rows for a NEVER-CONSUMED rollout id
#      (ATTESTATION_REPLAY guard). The fixture is deployment-time material
#      (signatures over timestamps); the drill deliberately never applies it,
#      so migration 70 blocks deterministically on pass2 AND pass3. Only the
#      fixture's manifestDigest feeds the ALTER DATABASE GUCs (block F).
#
# EVIDENCE — exactly 7 bounded artifacts in the run dir
#   $V11_P7_EVIDENCE_OUT (default: tasks/evidence/v11-r1-p7/runs/<run-id>)
#   receives:
#     candidate-manifest.json, fresh.json, production.json, summary.json,
#     migration70-blocker-fresh.log, migration70-blocker-production.log,
#     removed-raw-evidence.json
#   Raw deploy/postgres logs and fixtures live only in a temp dir: they are
#   extracted, scanned and DELETED; removed-raw-evidence.json records every
#   deleted raw (path, category, sha256, bytes). No logs/ or fixtures/
#   directories are persisted. Passwords and connection URLs are NEVER
#   written to disk; logs are defensively scrubbed before archiving.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
FIXTURE_HELPER="$HERE/v11-p7-fixture.mjs"
MANIFEST_SQL="$HERE/f1-source-manifest.sql"

IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
EVIDENCE_HELPER="$HERE/v11-r1-p7-evidence.mjs"
V11_P7_SCHEMA_VERSION="v11-r1-p7-run-1"
RUNNER_ROLE_ATTRIBUTES="vanstro_migrator:LOGIN,NOINHERIT,NOSUPERUSER,NOCREATEDB,NOCREATEROLE,NOREPLICATION,NOBYPASSRLS;cap-role memberships WITH ADMIN OPTION;owner of database+public schema;runner=prisma migrate deploy over 127.0.0.1 TCP"
EVIDENCE_ROOT=${V11_P7_EVIDENCE_ROOT:-"$ROOT/tasks/evidence/v11-r1-p7"}
RUN_ID=${V11_P7_RUN_ID:-$(node "$EVIDENCE_HELPER" run-id)}
node "$EVIDENCE_HELPER" validate-run-id "$RUN_ID" || { echo "P7 drill: invalid run id '$RUN_ID'" >&2; exit 1; }
if [ -n "${V11_P7_EVIDENCE_OUT:-}" ]; then
  OUT="$V11_P7_EVIDENCE_OUT"
else
  OUT="$EVIDENCE_ROOT/runs/$RUN_ID"
fi
if [ -e "$OUT" ]; then
  echo "P7 drill: refusing existing evidence run dir: $OUT" >&2
  exit 1
fi
mkdir -p "$OUT"
TMP_ROOT=$(mktemp -d)
LOGS="$TMP_ROOT/logs"
FIXTURES="$TMP_ROOT/fixtures"
mkdir -p "$LOGS" "$FIXTURES"
RAWS="$TMP_ROOT/raw-evidence.jsonl"
: > "$RAWS"

command -v docker >/dev/null 2>&1 || { echo "P7 drill requires docker" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "P7 drill requires node" >&2; exit 1; }
if ! command -v pnpm >/dev/null 2>&1; then PATH="$HOME/.local/bin:$PATH"; fi
command -v pnpm >/dev/null 2>&1 || { echo "P7 drill requires pnpm" >&2; exit 1; }
[ -f "$FIXTURE_HELPER" ] || { echo "missing fixture helper: $FIXTURE_HELPER" >&2; exit 1; }
[ -f "$MANIFEST_SQL" ] || { echo "missing manifest sql: $MANIFEST_SQL" >&2; exit 1; }

PRISMA=(pnpm --dir "$ROOT/packages/db" exec prisma)
PRISMA_VERSION=$("${PRISMA[@]}" --version 2>/dev/null | head -n 1 || true)
GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
POSTGRES_IMAGE_ID=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null | sed 's/^sha256://' || echo unknown)

MIG69="20260804100000_f1_v15_expand"
MIG70="20260804110000_f1_v15_phase_b"
EXPECTED_TOTAL=81

# ---- candidate identities (Authority Gate E1; env-overridable) --------------
# For working-tree candidates testedCommit/testedTree are the BASE identity
# (they never pretend to include uncommitted diff); candidateManifestSha binds
# the complete allowed closure file SHAs instead.
TESTED_CANDIDATE_KIND=${V11_P7_CANDIDATE_KIND:-working-tree}
TESTED_COMMIT=${V11_P7_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)}
TESTED_TREE=${V11_P7_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}' 2>/dev/null || echo unknown)}
BASE_HEAD=${V11_P7_BASE_HEAD:-$TESTED_COMMIT}
BASE_TREE=${V11_P7_BASE_TREE:-$TESTED_TREE}
# commit-kind runs MUST bind the actual HEAD/tree — never an env-var fiction
if [ "$TESTED_CANDIDATE_KIND" = "commit" ]; then
  ACTUAL_HEAD=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)
  ACTUAL_TREE=$(git -C "$ROOT" rev-parse 'HEAD^{tree}' 2>/dev/null || true)
  if [ -z "$ACTUAL_HEAD" ] || [ "$TESTED_COMMIT" != "$ACTUAL_HEAD" ] || [ "$TESTED_TREE" != "$ACTUAL_TREE" ]; then
    echo "P7 drill: commit-kind run must bind the actual HEAD/tree (testedCommit=$TESTED_COMMIT actual=$ACTUAL_HEAD; testedTree=$TESTED_TREE actual=$ACTUAL_TREE)" >&2
    exit 1
  fi
fi
MIGRATION69_SHA=${V11_P7_MIGRATION69_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG69/migration.sql" | cut -d' ' -f1)}
MIGRATION70_SHA=${V11_P7_MIGRATION70_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG70/migration.sql" | cut -d' ' -f1)}
HARNESS_SHA=${V11_P7_HARNESS_SHA:-$(shasum -a 256 "$0" | cut -d' ' -f1)}
CONFORMANCE_SHA=${V11_P7_CONFORMANCE_SHA:-$(shasum -a 256 "$ROOT/tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs" | cut -d' ' -f1)}

# ---- candidate manifest: canonical payload + digest (never self-containing) --
MANIFEST_ARGS=(manifest --root "$ROOT" --run-id "$RUN_ID" --generated-at "$GENERATED_AT" \
  --kind "$TESTED_CANDIDATE_KIND" --base-head "$BASE_HEAD" --base-tree "$BASE_TREE" --out "$OUT")
for spec in ${V11_P7_MANIFEST_EXTRA:-}; do MANIFEST_ARGS+=(--file="$spec"); done
MANIFEST_RESULT=$(node "$EVIDENCE_HELPER" "${MANIFEST_ARGS[@]}")
CANDIDATE_MANIFEST_SHA=$(printf '%s' "$MANIFEST_RESULT" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.parse(d).digest))')
if [ -n "${V11_P7_CANDIDATE_MANIFEST_SHA:-}" ] && [ "$V11_P7_CANDIDATE_MANIFEST_SHA" != "$CANDIDATE_MANIFEST_SHA" ]; then
  echo "P7 drill: candidateManifestSha mismatch — expected $V11_P7_CANDIDATE_MANIFEST_SHA, computed $CANDIDATE_MANIFEST_SHA" >&2
  exit 1
fi
IDENTITY_FILE="$TMP_ROOT/identity.json"
node "$EVIDENCE_HELPER" identity \
  schemaVersion="$V11_P7_SCHEMA_VERSION" runId="$RUN_ID" generatedAt="$GENERATED_AT" \
  testedCandidateKind="$TESTED_CANDIDATE_KIND" testedCommit="$TESTED_COMMIT" testedTree="$TESTED_TREE" \
  baseHead="$BASE_HEAD" baseTree="$BASE_TREE" migration69Sha="$MIGRATION69_SHA" migration70Sha="$MIGRATION70_SHA" \
  candidateManifestSha="$CANDIDATE_MANIFEST_SHA" harnessSha="$HARNESS_SHA" conformanceSha="$CONFORMANCE_SHA" \
  postgresImage="$IMAGE" postgresImageId="$POSTGRES_IMAGE_ID" prismaVersion="$PRISMA_VERSION" \
  runnerRoleAttributes="$RUNNER_ROLE_ATTRIBUTES" > "$IDENTITY_FILE"

now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }
# millisecond-precision ISO: window ends must not truncate the final second
# (postgres log stamps carry .xxx — a second-precision end would exclude them)
now_iso() { node -e 'process.stdout.write(new Date().toISOString())'; }
json_enc() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }
fixture_val() { node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]])' "$1" "$2"; }

sanitize_file() { # scrub any credential-shaped content before archiving
  sed -E \
    -e 's#postgresql://[^ @/]+:[^ @/]*@#postgresql://***@#g' \
    -e 's#(PGPASSWORD|POSTGRES_PASSWORD|DATABASE_PASSWORD|SUPER_PASSWORD|MIGRATOR_PASSWORD)=[^ ]*#\1=***#g' \
    -e "s#PASSWORD[[:space:]]+'[^']*'#PASSWORD '***'#g" \
    "$1" > "$1.sanitized" && mv "$1.sanitized" "$1"
}

track_raw() { # track_raw <run-dir-relative-path> <category> <file>  (RAW sha BEFORE sanitize)
  local rel=$1 cat=$2 f=$3 sha bytes
  [ -f "$f" ] || return 0
  sha=$(shasum -a 256 "$f" | cut -d' ' -f1)
  bytes=$(wc -c < "$f" | tr -d ' ')
  printf '{"path":%s,"category":%s,"sha256":%s,"bytes":%s}\n' \
    "$(json_enc "$rel")" "$(json_enc "$cat")" "$(json_enc "$sha")" "$bytes" >> "$RAWS"
}

node_field() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(j[process.argv[1]]??""))})' "$1"; }

cleanup() {
  docker rm -f vanstro-v11-p7-fresh-pg >/dev/null 2>&1 || true
  docker rm -f vanstro-v11-p7-prod-pg >/dev/null 2>&1 || true
  rm -rf "$TMP_ROOT"
  unset DATABASE_URL SUPER_PASSWORD MIGRATOR_PASSWORD FRESH_SUPER FRESH_MIGRATOR PROD_SUPER PROD_MIGRATOR || true
}
trap cleanup EXIT

# =============================================================================
# one path: provision → (baseline 1..41) → pass1(fail 69) → manifest+GUCs →
# pass2(fail 70) → resolve (NO fixture) → pass3(fail 70 again) → blocker
# evidence (applied=69, failed=M70, sqlState+signature)
# =============================================================================
run_path_flow() {
  local tag=$1 container=$2 db=$3 baseline=$4 super_pass=$5 migrator_pass=$6
  local dburl facts segs recs
  local port
  facts="$LOGS/$tag-facts.jsonl"
  segs="$LOGS/$tag-segments.jsonl"
  recs="$LOGS/$tag-recoveries.jsonl"
  : > "$facts"; : > "$segs"; : > "$recs"

  local SEC_NAME="" SEC_START_MS="" SEC_START_ISO=""
  seg() { SEC_NAME="$1"; SEC_START_MS=$(now_ms); SEC_START_ISO=$(now_iso); }
  seg_end() { # seg_end [appliedCount] [failedMigration]
    local end_ms end_iso dur json
    end_ms=$(now_ms); end_iso=$(now_iso)
    dur=$((end_ms - SEC_START_MS))
    json="{\"name\":\"$SEC_NAME\",\"startedAt\":\"$SEC_START_ISO\",\"endedAt\":\"$end_iso\",\"durationMs\":$dur"
    [ $# -ge 1 ] && json="$json,\"appliedCount\":$1"
    [ $# -ge 2 ] && json="$json,\"failedMigration\":\"$2\""
    printf '%s}\n' "$json" >> "$segs"
  }
  record_fact() { printf '{"key":"%s","value":%s}\n' "$1" "$2" >> "$facts"; }
  record_assert() { # record_assert <key> <expected> <actual>
    local pass="true"
    [ "$2" = "$3" ] || pass="false"
    printf '{"key":"assert:%s","value":{"expected":%s,"actual":%s,"pass":%s}}\n' \
      "$1" "$(json_enc "$2")" "$(json_enc "$3")" "$pass" >> "$facts"
  }
  record_recovery() { # record_recovery <migration> <sqlState> <message> <action> <reason> <startedAt> <endedAt>
    printf '{"migration":"%s","sqlState":"%s","message":%s,"action":%s,"reason":%s,"startedAt":%s,"endedAt":%s}\n' \
      "$1" "$2" "$(json_enc "$3")" "$(json_enc "$4")" "$(json_enc "$5")" "$(json_enc "$6")" "$(json_enc "$7")" >> "$recs"
  }

  psql_super() {
    docker exec -i -e PGPASSWORD="$super_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
      -v p7_db="$db" -v p7_migrator_pass="$migrator_pass" -U postgres -d "$db" "$@"
  }
  psql_migrator() {
    docker exec -i -e PGPASSWORD="$migrator_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
      -v p7_db="$db" -v p7_migrator_pass="$migrator_pass" -U vanstro_migrator -d "$db" "$@"
  }
  q_super() { docker exec -e PGPASSWORD="$super_pass" "$container" psql -X -t -A -U postgres -d "$db" -c "$1"; }

  deploy_pass() { # deploy_pass <label>; writes $LOGS/$tag-<label>.log, sets DEPLOY_RC
    local logf="$LOGS/$tag-$1.log"
    set +e
    DATABASE_URL="$dburl" "${PRISMA[@]}" migrate deploy >"$logf" 2>&1
    DEPLOY_RC=$?
    set -e
    track_raw "logs/$tag-$1.log" deploy-log "$logf"
    sanitize_file "$logf"
  }
  deploy_baseline_pass() { # deploy only the first $baseline migrations from an isolated schema tree
    local logf schema_dir selected migration
    logf="$LOGS/$tag-baseline.log"
    schema_dir="$TMP_ROOT/$tag-prisma"
    selected=0
    rm -rf "$schema_dir"
    mkdir -p "$schema_dir/migrations"
    cp "$ROOT/packages/db/prisma/schema.prisma" "$schema_dir/schema.prisma"
    cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$schema_dir/migrations/migration_lock.toml"
    for migration in "$ROOT/packages/db/prisma/migrations"/*; do
      [ -d "$migration" ] || continue
      selected=$((selected + 1))
      cp -R "$migration" "$schema_dir/migrations/$(basename "$migration")"
      [ "$selected" -lt "$baseline" ] || break
    done
    [ "$selected" -eq "$baseline" ] || { echo "expected $baseline baseline migrations, selected $selected" > "$logf"; DEPLOY_RC=1; return; }
    set +e
    DATABASE_URL="$dburl" "${PRISMA[@]}" migrate deploy --schema "$schema_dir/schema.prisma" >"$logf" 2>&1
    DEPLOY_RC=$?
    set -e
    track_raw "logs/$tag-baseline.log" baseline-log "$logf"
    sanitize_file "$logf"
  }
  resolve_rolled_back() { # resolve_rolled_back <migration>
    set +e
    DATABASE_URL="$dburl" "${PRISMA[@]}" migrate resolve --rolled-back "$1" \
      >"$LOGS/$tag-resolve-$1.log" 2>&1
    local rc=$?
    set -e
    track_raw "logs/$tag-resolve-$1.log" resolve-log "$LOGS/$tag-resolve-$1.log"
    sanitize_file "$LOGS/$tag-resolve-$1.log"
    [ "$rc" -eq 0 ]
  }
  applied_count() { q_super "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL"; }
  failed_list() { q_super "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at"; }
  rolled_back_list() { q_super "SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL ORDER BY started_at"; }
  extract_error() { # extract_error <migration> → ERROR_STATE + ERROR_MSG globals
    local mig=$1 logs
    logs=$(q_super "SELECT COALESCE(logs,'') FROM _prisma_migrations WHERE migration_name='$mig'")
    ERROR_MSG=$(printf '%s' "$logs" | tr '\n' ' ' | cut -c1-300)
    ERROR_MSG=$(printf '%s' "$ERROR_MSG" | sed -E 's#postgresql://[^ @/]+:[^ @/]*@#postgresql://***@#g')
    ERROR_STATE=$(printf '%s' "$logs" | grep -oE 'SQLSTATE[=: ]+[0-9A-Z]{5}' | head -n 1 | grep -oE '[0-9A-Z]{5}$' || true)
    if [ -z "${ERROR_STATE:-}" ]; then
      ERROR_STATE=$(printf '%s' "$logs" | grep -oE 'error code[=: ]+[0-9A-Z]{5}' | head -n 1 | grep -oE '[0-9A-Z]{5}$' || true)
    fi
    if [ -z "${ERROR_STATE:-}" ]; then
      ERROR_STATE=$(printf '%s' "$logs" | grep -oE '\bP[0-9]{4}\b' | head -n 1 || true)
    fi
    ERROR_STATE=${ERROR_STATE:-UNKNOWN}
  }
  snapshot_and_extract_error() { # snapshot_and_extract_error <passLabel> -> P7_FIRST_JSON
    local label=$1
    local snap="$LOGS/$tag-postgres-$label.log"
    docker logs "$container" > "$snap" 2>&1 || true
    track_raw "logs/$tag-postgres-$label.log" postgres-log "$snap"
    sanitize_file "$snap"
    P7_FIRST_JSON=$(node "$EVIDENCE_HELPER" extract-first-error --log "$snap" --start "$SEC_START_ISO" --end "$(now_iso)" 2>/dev/null || true)
    if [ -z "$P7_FIRST_JSON" ] || [ "$P7_FIRST_JSON" = "null" ]; then
      P7_FIRST_JSON='{"sqlState":"UNKNOWN","message":"","statement":"","firstErrorSignature":"","query":"","context":""}'
    fi
  }
  set_gucs() { # set_gucs <rollout> <environment> <manifestDigest>
    psql_super -v p7_rollout="$1" -v p7_env="$2" -v p7_digest="$3" >/dev/null <<'SQL'
ALTER DATABASE :"p7_db" SET vanstro.rollout_id TO :'p7_rollout';
ALTER DATABASE :"p7_db" SET vanstro.environment TO :'p7_env';
ALTER DATABASE :"p7_db" SET vanstro.manifest_digest TO :'p7_digest';
SQL
  }

  record_fact "image" "$(json_enc "$IMAGE")"
  record_fact "prismaVersion" "$(json_enc "$PRISMA_VERSION")"
  record_fact "testedCommit" "$(json_enc "$TESTED_COMMIT")"
  record_fact "testedTree" "$(json_enc "$TESTED_TREE")"
  record_fact "generatedAt" "$(json_enc "$GENERATED_AT")"
  record_fact "baselineTarget" "$baseline"

  # ---- provision: container + full admin contract (blocks A-E) -------------
  seg provision
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker run -d --name "$container" -e POSTGRES_PASSWORD="$super_pass" -e POSTGRES_DB="$db" \
    -p 127.0.0.1::5432 "$IMAGE" \
    -c log_error_verbosity=verbose -c log_min_error_statement=error >/dev/null
  local ready=false
  for _ in $(seq 1 60); do
    if docker exec -e PGPASSWORD="$super_pass" "$container" pg_isready -U postgres -d "$db" >/dev/null 2>&1; then
      ready=true; break
    fi
    sleep 1
  done
  [ "$ready" = true ] || { record_fact "aborted" "$(json_enc 'postgres not ready')"; seg_end; return 1; }
  port=$(docker port "$container" 5432/tcp | sed 's/.*://')
  dburl="postgresql://vanstro_migrator:${migrator_pass}@127.0.0.1:${port}/${db}?schema=public"

  psql_super >/dev/null <<'SQL'
-- A. role topology: exact attributes are asserted by migration 59
--    (p07_media_role_boundary) and 69 BEFORE those migrations run — a
--    migration cannot bootstrap the principals it executes as, so this is an
--    out-of-migration admin action. vanstro_crypto_verifier_owner is the
--    owner of the external crypto verifier preset (block E) that migration
--    70 invokes at deploy time.
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_worker_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_media_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p02_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p04_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p08_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p09_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_dsar_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_telemetry_guard_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_crypto_verifier_owner NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_worker_lifecycle_cap NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_release_cap NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_signer_admin_cap NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_kms_rotation_cap NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_p10_dsar_cap NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_signer_admin_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_kms_rotation_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_dsar_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE vanstro_telemetry_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- Memberships carry ADMIN OPTION: migration 69 runs AS vanstro_migrator and
-- GRANTs the cap roles to the runtime principals; migration 59 requires
-- migrator to be MEMBER of vanstro_media_guard_owner. Without ADMIN OPTION
-- the migrations themselves would fail with insufficient_privilege.
GRANT vanstro_media_guard_owner,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p08_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner,vanstro_crypto_verifier_owner TO vanstro_migrator WITH ADMIN OPTION;
GRANT vanstro_worker_lifecycle_cap,vanstro_p10_release_cap,vanstro_p10_signer_admin_cap,vanstro_p10_kms_rotation_cap,vanstro_p10_dsar_cap TO vanstro_migrator WITH ADMIN OPTION;
-- B. ownership: migrator must own database + public schema so the REVOKEs and
--    ALTER OWNER statements in migrations 59/69 run without privilege errors,
--    and so migrator can install trusted extensions.
ALTER DATABASE :"p7_db" OWNER TO vanstro_migrator;
ALTER SCHEMA public OWNER TO vanstro_migrator;
-- C. CREATE revocation: migration 59 ASSERTS (before re-revoking) that PUBLIC
--    and vanstro_runtime lack CREATE on database and public schema; migration
--    69 additionally revokes vanstro_worker_runtime. Prior state, hence an
--    out-of-migration admin action.
REVOKE CREATE ON DATABASE :"p7_db" FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
-- D. extensions: pgcrypto backs the external verifier functions (no migration
--    installs it); pg_trgm is migration 19's package (IF NOT EXISTS makes the
--    pre-install a no-op, but the extension itself is platform-owned).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- E. crypto verifier preset (owned by vanstro_crypto_verifier_owner): the
--    migrations ship SECURITY DEFINER functions that CALL these at runtime
--    (migration 70's f1_consume_no_old_instances_v2 verifies the deployment
--    attestation signature through vanstro_verify_ed25519_v1); the verifier
--    implementation + key material deliberately lives outside the migration
--    tree. KAT-only allowlist here; the migration-70 fixture step ORs in the
--    fixture tuple via CREATE OR REPLACE.
CREATE FUNCTION public.vanstro_subject_erasure_token_v1(input bytea) RETURNS bytea
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$ SELECT public.hmac(input, decode(repeat('42',32),'hex'), 'sha256') $$;
ALTER FUNCTION public.vanstro_subject_erasure_token_v1(bytea) OWNER TO vanstro_crypto_verifier_owner;
REVOKE ALL ON FUNCTION public.vanstro_subject_erasure_token_v1(bytea) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.vanstro_subject_erasure_token_v1(bytea) TO vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_migrator;
CREATE FUNCTION public.vanstro_verify_ed25519_v1(payload bytea, signature bytea, public_key bytea) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog
AS $fn$ SELECT (public.digest(payload,'sha256')=decode('9050b73baea6322d588df611f0c61fb6d1c5f5a40fa6605004491995bbaa8604','hex') AND signature=decode('9db30313d6371f494262a9351f1e5a1a02bfa95bf2b114c83da9b91e3b32098d40a22fd6fc7e6c98910ea00bb4835d3bdd9ff9f0d797b80c0d426e390464fb03','hex') AND public_key=decode('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex')) $fn$;
ALTER FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) OWNER TO vanstro_crypto_verifier_owner;
REVOKE ALL ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
GRANT EXECUTE ON FUNCTION public.vanstro_verify_ed25519_v1(bytea,bytea,bytea) TO vanstro_p10_guard_owner,vanstro_migrator,vanstro_telemetry_guard_owner;
-- migrator login credential (used by the psql-as-migrator provisioning of
-- block G; the deploy itself authenticates over TCP with this password)
ALTER ROLE vanstro_migrator PASSWORD :'p7_migrator_pass';
SQL

  local role_count
  role_count=$(q_super "SELECT count(*) FROM pg_roles WHERE rolname IN ('vanstro_migrator','vanstro_runtime','vanstro_worker_runtime','vanstro_media_guard_owner','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner','vanstro_crypto_verifier_owner','vanstro_worker_lifecycle_cap','vanstro_p10_release_cap','vanstro_p10_signer_admin_cap','vanstro_p10_kms_rotation_cap','vanstro_p10_dsar_cap','vanstro_signer_admin_runtime','vanstro_kms_rotation_runtime','vanstro_dsar_runtime','vanstro_telemetry_runtime')")
  record_assert "provision.roles" "21" "$role_count"
  seg_end

  # ---- production baseline: REAL deploy 1..41 (must succeed) ---------------
  if [ "$baseline" -gt 0 ]; then
    seg baseline
    deploy_baseline_pass
    local b_applied
    b_applied=$(applied_count)
    record_fact "baseline.applied" "$b_applied"
    if [ "$DEPLOY_RC" -ne 0 ] || [ "$b_applied" -ne "$baseline" ]; then
      record_fact "aborted" "$(json_enc "baseline deploy failed rc=$DEPLOY_RC applied=$b_applied expected=$baseline")"
      seg_end
      return 1
    fi
    seg_end "$b_applied"
  fi

  # ---- pass 1: deploy until migration 69 fails deterministically -----------
  seg "deploy-pass1"
  deploy_pass "deploy-pass1"
  local p1_applied p1_failed
  p1_applied=$(applied_count)
  p1_failed=$(failed_list | tr -d ' \n')
  record_fact "pass1.applied" "$p1_applied"
  if [ "$DEPLOY_RC" -eq 0 ]; then
    record_fact "aborted" "$(json_enc "pass1 unexpectedly succeeded (applied=$p1_applied)")"
    seg_end "$p1_applied"
    return 1
  fi
  if [ "$p1_failed" != "$MIG69" ]; then
    record_fact "aborted" "$(json_enc "pass1 failed at unexpected migration: '$p1_failed'")"
    seg_end "$p1_applied" "$p1_failed"
    return 1
  fi
  extract_error "$MIG69"
  record_fact "pass1.firstSqlState" "$(json_enc "$ERROR_STATE")"
  seg_end "$p1_applied" "$MIG69"

  # ---- block G + F: manifest/audit (as migrator) + GUCs ---------------------
  seg "provision-manifest"
  local RESOLVE_START RESOLVE_END
  RESOLVE_START=$(now_iso)
  resolve_rolled_back "$MIG69" || { record_fact "aborted" "$(json_enc "resolve --rolled-back $MIG69 failed")"; seg_end; return 1; }
  RESOLVE_END=$(now_iso)
  record_recovery "$MIG69" "$ERROR_STATE" "$ERROR_MSG" "resolve --rolled-back; provision 68-row f1_source_migration_manifest + f1_authority_bootstrap_audit AS vanstro_migrator; ALTER DATABASE GUCs" "deterministic failure: f1_v15_expand asserts the out-of-migration manifest/audit tables + bootstrap roles; the deploy transaction rolled the migration back; resolve --rolled-back (never --applied) records the true never-applied state for the retry" "$RESOLVE_START" "$RESOLVE_END"
  local fixture_a
  fixture_a="$FIXTURES/fixture-$tag-rollout-$tag-a.json"
  node "$FIXTURE_HELPER" --root "$ROOT" --out "$FIXTURES" --tag "$tag" --rollout "rollout-$tag-a" >/dev/null
  track_raw "fixtures/fixture-$tag-rollout-$tag-a.sql" fixture-sql "$FIXTURES/fixture-$tag-rollout-$tag-a.sql"
  track_raw "fixtures/fixture-$tag-rollout-$tag-a.json" fixture-json "$fixture_a"
  local manifest_digest_a
  manifest_digest_a=$(fixture_val "$fixture_a" manifestDigest)
  # G. manifest + bootstrap audit created AS vanstro_migrator: migration 69
  #    ALTERs the OWNER of both tables to vanstro_migrator (a privilege only
  #    the owner or a superuser holds) — pre-creating them as migrator is the
  #    out-of-migration admin contract the migration asserts.
  psql_migrator -v p7_digest="$manifest_digest_a" >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS public.f1_source_migration_manifest (name text PRIMARY KEY, checksum text NOT NULL);
CREATE TABLE IF NOT EXISTS public.f1_authority_bootstrap_audit (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "operation" text NOT NULL,
  "objectIdentity" text NOT NULL,
  "actor" text NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manifestDigest" text NOT NULL
);
INSERT INTO public.f1_authority_bootstrap_audit ("operation","objectIdentity","actor","manifestDigest")
VALUES ('bootstrap','roles/source manifest (68 rows)','vanstro_migrator', :'p7_digest');
SQL
  docker exec -i -e PGPASSWORD="$migrator_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
    -U vanstro_migrator -d "$db" < "$MANIFEST_SQL" >/dev/null
  local manifest_rows audit_rows
  manifest_rows=$(q_super "SELECT count(*) FROM public.f1_source_migration_manifest")
  audit_rows=$(q_super "SELECT count(*) FROM public.f1_authority_bootstrap_audit")
  record_assert "manifest.rows" "68" "$manifest_rows"
  record_assert "manifest.auditRows" "1" "$audit_rows"
  psql_super >/dev/null <<'SQL'
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_migrator,vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner;
SQL
  record_assert "manifest.schemaCreateOwners" "7" "$(q_super "SELECT count(*) FROM pg_roles WHERE rolname IN('vanstro_migrator','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner') AND has_schema_privilege(rolname,'public','CREATE')")"
  local diag_db diag_log diag_rc
  diag_db="${db}_m69diag"
  diag_log="$LOGS/$tag-migration69-diagnostic.log"
  docker exec -e PGPASSWORD="$super_pass" "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "CREATE DATABASE \"$diag_db\" WITH TEMPLATE \"$db\"" >/dev/null
  set +e
  docker exec -i -e PGPASSWORD="$migrator_pass" "$container" psql -X -v ON_ERROR_STOP=1 -U vanstro_migrator -d "$diag_db" < "$ROOT/packages/db/prisma/migrations/$MIG69/migration.sql" > "$diag_log" 2>&1
  diag_rc=$?
  set -e
  track_raw "logs/$tag-migration69-diagnostic.log" diagnostic-log "$diag_log"
  sanitize_file "$diag_log"
  docker exec -e PGPASSWORD="$super_pass" "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -c "DROP DATABASE \"$diag_db\"" >/dev/null
  record_assert "migration69.diagnosticExit" "0" "$diag_rc"
  # new69 must run clean as the real migrator: any stderr ACL warning
  # ("no privileges could be revoked"/"no privileges were granted") means the
  # closed-set REVOKE/GRANT matrix drifted from the catalog.
  local diag_acl_warnings
  diag_acl_warnings=$(grep -cE "no privileges could be revoked|no privileges were granted" "$diag_log" || true)
  record_assert "migration69.aclWarnings" "0" "$diag_acl_warnings"
  # F. ALTER DATABASE GUCs: migration 70 reads these via current_setting() on
  #    every deploy connection; only database-level SET survives the runner's
  #    fresh sessions — another out-of-migration admin action.
  set_gucs "rollout-$tag-a" "test" "$manifest_digest_a"
  record_fact "fixtureA" "$(node "$EVIDENCE_HELPER" fixture-summary --fixture "$fixture_a" --tag "$tag")"
  seg_end

  # ---- pass 2: deploy until migration 70 fails deterministically ------------
  seg "deploy-pass2"
  deploy_pass "deploy-pass2"
  local p2_applied p2_failed
  p2_applied=$(applied_count)
  p2_failed=$(failed_list | tr -d ' \n')
  record_fact "pass2.applied" "$p2_applied"
  if [ "$DEPLOY_RC" -eq 0 ]; then
    record_fact "aborted" "$(json_enc "pass2 unexpectedly succeeded (applied=$p2_applied)")"
    seg_end "$p2_applied"
    return 1
  fi
  if [ "$p2_failed" != "$MIG70" ]; then
    record_fact "aborted" "$(json_enc "pass2 failed at unexpected migration: '$p2_failed'")"
    seg_end "$p2_applied" "$p2_failed"
    return 1
  fi
  extract_error "$MIG70"
  snapshot_and_extract_error "pass2"
  record_fact "pass2.firstSqlState" "$(json_enc "$ERROR_STATE")"
  record_fact "pass2.failed" "$(json_enc "$p2_failed")"
  record_fact "pass2.firstError" "$P7_FIRST_JSON"
  printf '%s\n' "$P7_FIRST_JSON" > "$LOGS/$tag-pass2-error.json"
  seg_end "$p2_applied" "$MIG70"

  # ---- blocker reproduction: resolve 70; NO fixture — pass3 must fail again --
  seg "provision-blocker"
  RESOLVE_START=$(now_iso)
  resolve_rolled_back "$MIG70" || { record_fact "aborted" "$(json_enc "resolve --rolled-back $MIG70 failed")"; seg_end; return 1; }
  RESOLVE_END=$(now_iso)
  record_recovery "$MIG70" "$ERROR_STATE" "$ERROR_MSG" "resolve --rolled-back; fixture intentionally NOT provisioned" "deterministic blocker: f1_v15_phase_b consumes the deployment fixture that is absent by design; the deploy transaction rolled the migration back; resolve --rolled-back (never --applied) records the true never-applied state so pass3 reproduces the blocker" "$RESOLVE_START" "$RESOLVE_END"
  local rolled_back_csv
  rolled_back_csv=$(rolled_back_list | tr ' \n' ',')
  record_fact "ledger.rolledBack" "$(json_enc "$rolled_back_csv")"
  seg_end

  # ---- pass 3: deploy AGAIN — MUST stop at migration 70 with applied=69 -----
  # The fixture stays intentionally absent, so the blocker reproduces
  # deterministically. Crossing migration 70 (rc=0 or applied>69) is ALWAYS
  # FAIL: the expected blocker was not reproduced.
  seg "deploy-pass3"
  deploy_pass "deploy-pass3"
  local p3_applied p3_failed
  p3_applied=$(applied_count)
  p3_failed=$(failed_list | tr -d ' \n')
  record_fact "pass3.applied" "$p3_applied"
  record_fact "pass3.failed" "$(json_enc "$p3_failed")"
  extract_error "$MIG70"
  record_fact "pass3.firstSqlState" "$(json_enc "$ERROR_STATE")"
  snapshot_and_extract_error "pass3"
  record_fact "pass3.firstError" "$P7_FIRST_JSON"
  printf '%s\n' "$P7_FIRST_JSON" > "$LOGS/$tag-pass3-error.json"
  local p3_classification p3_state p3_sig
  p3_classification=$(node "$EVIDENCE_HELPER" classify-pass3 --rc "$DEPLOY_RC" --applied "$p3_applied" --failed "$p3_failed")
  p3_state=$(printf '%s' "$P7_FIRST_JSON" | node_field sqlState)
  p3_sig=$(printf '%s' "$P7_FIRST_JSON" | node_field firstErrorSignature)
  # UNKNOWN SQLSTATE / empty signature are NEVER accepted as a reproduced blocker
  if [ "$(printf '%s' "$p3_classification" | node_field verdict)" = "EXPECTED_BLOCKED_M70" ] && { [ "$p3_state" = "UNKNOWN" ] || [ -z "$p3_sig" ]; }; then
    p3_classification=$(printf '{"verdict":"FAIL","reason":"UNKNOWN_SQLSTATE","detail":"pass3 extract sqlState=%s firstErrorSignature=%s"}' "$p3_state" "$p3_sig")
  fi
  record_fact "pass3.classification" "$p3_classification"
  printf '%s\n' "$p3_classification" > "$LOGS/$tag-classification.json"
  if [ "$(printf '%s' "$p3_classification" | node_field verdict)" != "EXPECTED_BLOCKED_M70" ]; then
    record_fact "aborted" "$(json_enc "pass3 did not reproduce the expected migration70 blocker: $p3_classification")"
    seg_end "$p3_applied" "$p3_failed"
    return 1
  fi
  # ---- blocker info: pass2/pass3 first-error consistency + final ledger -----
  local blocker_info
  blocker_info=$(node "$EVIDENCE_HELPER" blocker-info \
    --pass2 "$(cat "$LOGS/$tag-pass2-error.json")" \
    --pass3 "$P7_FIRST_JSON" \
    --applied "$p3_applied" --failed "$p3_failed" --rolled-back "$rolled_back_csv")
  record_fact "blocker.info" "$blocker_info"
  printf '%s\n' "$blocker_info" > "$LOGS/$tag-blocker.json"
  seg_end "$p3_applied" "$MIG70"
  record_fact "consumedRollout" "$(json_enc "none (fixture intentionally absent)")"
  return 0
}

assemble_path() { # assemble_path <tag> <container> <db> <rc> [blockerFile] [classificationFile] [identityFile]
  local tag=$1 container=$2 db=$3 rc=$4 blockerFile=${5:-} classificationFile=${6:-} identityFile=${7:-}
  node - "$OUT" "$LOGS" "$tag" "$container" "$db" "$rc" "$blockerFile" "$classificationFile" "$identityFile" "$EXPECTED_TOTAL" <<'NODE'
const [out, logs, tag, container, db, rc, blockerFile, classificationFile, identityFile, expectedTotal] = process.argv.slice(2);
const fs = require("node:fs");
const readJsonl = (p) =>
  fs.existsSync(p)
    ? fs.readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const readJson = (p) => (p && fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const segments = readJsonl(`${logs}/${tag}-segments.jsonl`);
const recoveries = readJsonl(`${logs}/${tag}-recoveries.jsonl`);
const assertions = {};
const facts = {};
for (const f of readJsonl(`${logs}/${tag}-facts.jsonl`)) {
  if (f.key.startsWith("assert:")) assertions[f.key.slice(7)] = f.value;
  else facts[f.key] = f.value;
}
const identity = readJson(identityFile);
const classification = readJson(classificationFile) ?? {
  verdict: "FAIL",
  reason: "ABORTED",
  detail: String(facts.aborted ?? "path aborted before pass3 classification"),
};
const blocker = readJson(blockerFile);
const list = Object.values(assertions);
const provisionOk = list.every((a) => a.pass === true);
const classificationOut = { ...classification };
let verdict = classification.verdict === "EXPECTED_BLOCKED_M70" && provisionOk ? "EXPECTED_BLOCKED_M70" : "FAIL";
if (classification.verdict === "EXPECTED_BLOCKED_M70" && !provisionOk) {
  classificationOut.reason = "PROVISION_ASSERTION_FAILED";
  classificationOut.detail = `blocker reproduced but provisioning assertions failed (${list.filter((a) => a.pass !== true).map((a) => a.key).join(",")})`;
}
const result = {
  schemaVersion: identity?.schemaVersion ?? "v11-r1-p7-run-1",
  runId: identity?.runId ?? null,
  path: tag,
  container,
  database: db,
  expectedTotal: Number(expectedTotal),
  verdict,
  classification: classificationOut,
  blocker,
  identity,
  segments,
  recoveries,
  assertions,
  facts,
};
fs.writeFileSync(`${out}/${tag}.json`, JSON.stringify(result, null, 2) + "\n");
process.stdout.write(`${tag}: ${verdict} (${list.length} assertions, ${recoveries.length} recoveries)\n`);
NODE
}

run_path() { # run_path <tag> <container> <db> <baseline>
  local tag=$1 container=$2 db=$3 baseline=$4
  local super_pass migrator_pass rc verdict
  super_pass="p7-super-${tag}-$(date +%s)"
  migrator_pass="p7-migrator-${tag}-$(date +%s)"
  set +e
  ( set -e; run_path_flow "$tag" "$container" "$db" "$baseline" "$super_pass" "$migrator_pass" )
  rc=$?
  docker logs "$container" > "$LOGS/$tag-postgres.log" 2>&1 || true
  track_raw "logs/$tag-postgres.log" postgres-log "$LOGS/$tag-postgres.log"
  sanitize_file "$LOGS/$tag-postgres.log"
  set -e
  assemble_path "$tag" "$container" "$db" "$rc" "$LOGS/$tag-blocker.json" "$LOGS/$tag-classification.json" "$IDENTITY_FILE"
  verdict=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).verdict)' "$OUT/$tag.json")
  if [ "$verdict" = "EXPECTED_BLOCKED_M70" ]; then
    return 0
  fi
  return 1
}

# =============================================================================
# run both paths (fresh 1→69, production 41→69) — each must STOP at migration 70
# =============================================================================
FRESH_RC=0
PROD_RC=0
run_path fresh vanstro-v11-p7-fresh-pg vanstro_p7_drill_fresh 0 || FRESH_RC=$?
run_path production vanstro-v11-p7-prod-pg vanstro_p7_drill_prod 41 || PROD_RC=$?

# ---- bounded migration70 blocker logs (one per path) ------------------------
BLOCKER_RATIONALE="EXPECTED_BLOCKER_REPRODUCED: pass3 deploy stopped at migration 70 with applied=69; fixture intentionally absent; no resolve performed after pass3 (final evidence state)"
if [ -f "$LOGS/fresh-blocker.json" ]; then
  node "$EVIDENCE_HELPER" blocker-log --identity "$IDENTITY_FILE" --info "$LOGS/fresh-blocker.json" \
    --tag fresh --rationale "$BLOCKER_RATIONALE" \
    --deploy-tail "$LOGS/fresh-deploy-pass3.log" --out "$OUT/migration70-blocker-fresh.log"
fi
if [ -f "$LOGS/production-blocker.json" ]; then
  node "$EVIDENCE_HELPER" blocker-log --identity "$IDENTITY_FILE" --info "$LOGS/production-blocker.json" \
    --tag production --rationale "$BLOCKER_RATIONALE" \
    --deploy-tail "$LOGS/production-deploy-pass3.log" --out "$OUT/migration70-blocker-production.log"
fi

# ---- removed-raw-evidence: every raw log/fixture recorded, then deleted ------
node "$EVIDENCE_HELPER" removed --records "$RAWS" --run-id "$RUN_ID" --out "$OUT/removed-raw-evidence.json"

# ---- summary: classifyOverall over both paths (EXPECTED_BLOCKED_M70 exit 0) --
SUMMARY_RESULT=$(node "$EVIDENCE_HELPER" summarize \
  --fresh "$OUT/fresh.json" --production "$OUT/production.json" \
  --identity "$IDENTITY_FILE" --generated-at "$GENERATED_AT" --evidence-dir "$OUT")
SUMMARY_OVERALL=$(printf '%s' "$SUMMARY_RESULT" | node_field overall)
SUMMARY_EXIT=$(printf '%s' "$SUMMARY_RESULT" | node_field exitCode)
SUMMARY_BLOCKED_AT=$(printf '%s' "$SUMMARY_RESULT" | node_field blockedAt)

if [ "$SUMMARY_OVERALL" = "EXPECTED_BLOCKED_M70" ]; then
  echo "P7_DRILL_EXPECTED_BLOCKED_M70 blockedAt=$SUMMARY_BLOCKED_AT isMigrationSuccess=false — evidence in $OUT"
else
  echo "P7_DRILL_FAILED fresh_rc=$FRESH_RC production_rc=$PROD_RC overall=$SUMMARY_OVERALL — evidence in $OUT" >&2
fi
exit "${SUMMARY_EXIT:-1}"
