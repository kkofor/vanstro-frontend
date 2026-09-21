#!/usr/bin/env bash
# =============================================================================
# V11-R1 FUNCTIONAL-FIRST F0 — disposable PG16 real `prisma migrate deploy`
# gate over the ORIGINAL migration chain (1..83) on two INDEPENDENT
# postgres:16-bookworm containers in one run.
#
# Goal (Gate F0, functional-first): prove the original migrations 1..83 deploy
# end-to-end with the REAL prisma migrate deploy runner (no db push, no
# resolve --applied, no manual _prisma_migrations ledger edits) when the
# out-of-migration admin contract is completed BEFORE migration 69 and the
# legal synthetic deployment fixture is injected AFTER migration 69:
#
#   fresh:              deploy 1..68 → manifest → deploy 69 → fixture →
#                       deploy 70..83 → no-op deploy
#   production-equiv:   deploy 1..41 → manifest → deploy 42..69 → fixture →
#                       deploy 70..83 → no-op deploy
#
# The boundary deploys run through TEMPORARY migration-view schema trees
# (copies of schema.prisma + migration_lock.toml + the selected migration
# dirs); every deploy is a REAL `prisma migrate deploy` invocation with
# DATABASE_URL over 127.0.0.1 TCP. The final 70..83 deploy and the no-op
# deploy run against the FULL migrations directory. Switching from a view to
# the full tree is checksum-safe: the view copies are byte-identical to the
# originals, so prisma detects no drift.
#
# WHY the manifest lands between two boundary deploys (and not before the
# first): prisma migrate deploy refuses to start against a schema that
# already contains tables when the _prisma_migrations ledger is empty
# (P3005 — baseline guard). The f1_source_migration_manifest and
# f1_authority_bootstrap_audit tables must exist BEFORE migration 69 asserts
# them (block G), so the runner completes block G right after the first
# boundary deploy — at that point the ledger is non-empty and P3005 no
# longer applies — and then deploys migration 69 (fresh) or 42..69
# (production) in a clean pass. No failure, no resolve, no manual ledger
# edit: every deploy succeeds on its first attempt.
#
# OUT-OF-MIGRATION ADMIN CONTRACT (mirrors the P7 drill's proven blocks; each
# annotated with WHY it cannot be a prisma migration — the migrations assert
# these as prior state):
#
#   A. ROLE TOPOLOGY — split deploy identity (functional-first F0/F2):
#      • boundary segments CONTAINING migration 59 deploy AS vanstro_migrator
#        (fresh 1..68 + 69; production 1..41 + 42..69): migration 59
#        hard-asserts current_user = session_user = 'vanstro_migrator' AND
#        asserts migrator is NOSUPERUSER/NOINHERIT, so those segments cannot
#        run as any other role. Memberships carry ADMIN OPTION so migration
#        69 (running as migrator) can GRANT the cap roles to the runtime
#        principals.
#      • the 70..83 deploy and the no-op second deploy run AS
#        vanstro_deployment_owner — a deployment-only database admin
#        (LOGIN SUPERUSER in this disposable PG16; migrate-only connection,
#        never API/Worker). Migrations 73/74 create the s01_settings_*
#        functions AS the deploy session, transfer ownership to
#        vanstro_p09_guard_owner (M73), then CREATE OR REPLACE them (M74):
#        PostgreSQL requires the REPLACE caller to own the function or be
#        superuser — vanstro_migrator membership is NOT sufficient
#        (empirically 42501), so the 70..83 segment uses the deployment-only
#        admin. Verified: no migration in 70..83 asserts current_user /
#        session_user / rolsuper / rolinherit, so the superuser session is
#        assertion-safe. Runtime roles (vanstro_runtime, vanstro_worker_runtime
#        and the guard owners) remain provisioned for the final functional
#        permission model and are NEVER used as deploy connections.
#   B. OWNERSHIP — migrator must own the database (extension + login rights)
#      and the public schema before the first migration runs.
#   C. CREATE REVOCATION — migration 59 ASSERTS PUBLIC/vanstro_runtime lack
#      CREATE on database and public schema; migration 69 extends to
#      vanstro_worker_runtime.
#   D. EXTENSIONS — pgcrypto + pg_trgm are platform packages, installed by
#      the operator, not schema.
#   E. CRYPTO VERIFIER PRESET — migration 70's f1_consume_no_old_instances_v2
#      verifies the deployment attestation through
#      vanstro_verify_ed25519_v1; the verifier + key material deliberately
#      live outside the migration tree (KAT-only allowlist here; the fixture
#      step ORs in the fixture tuple via CREATE OR REPLACE).
#   F. ALTER DATABASE GUCs — migration 70 reads vanstro.rollout_id /
#      vanstro.environment / vanstro.manifest_digest via current_setting()
#      on every deploy connection; only ALTER DATABASE persists custom GUCs
#      for the runner's fresh sessions.
#   G. 68-ROW SOURCE MANIFEST + BOOTSTRAP AUDIT — migration 69 asserts the
#      manifest's exact 68 (name, checksum) rows and ALTERs the OWNER of both
#      tables to vanstro_migrator, which requires migrator to ALREADY own
#      them: they are created AS vanstro_migrator before migration 69.
#   H. ATTESTATION/TELEMETRY FIXTURE (POST-69, superuser ONLY) — migration
#      70's f1_consume_no_old_instances_v2 consumes a signed deployment
#      attestation + exactly 31 old68 telemetry rows for a NEVER-CONSUMED
#      rollout id (ATTESTATION_REPLAY guard). The fixture is deployment-time
#      material (signatures over timestamps) injected by the disposable
#      superuser AFTER migration 69 created the f1_* tables, then the admin
#      deploys 70..83.
#   I. DEDUP/SEED FIXTURE (POST-69, superuser ONLY) — before the 70..83
#      deploy, the runner seeds one category/product/sku and THREE duplicate
#      status='active' prices for the same (skuId,currency) so migration 83's
#      backfill/dedup has real duplicate rows to archive (keeper = newest by
#      effectiveFrom DESC NULLS LAST, updatedAt DESC, id DESC). The seed also
#      gives migration 82's FK a real category to reference, and both paths
#      verify the 82/83 constraints + dedup outcome after the no-op deploy.
#
# EVIDENCE — bounded artifacts in the run dir
#   $V11_F0_EVIDENCE_OUT (default: tasks/evidence/v11-r1-functional-first-migration/runs/<run-id>)
#   receives: candidate-manifest.json, identity.json, fresh.json,
#   production.json, summary.json, removed-raw-evidence.json,
#   fresh-noop.log, production-noop.log and — on failure only —
#   fresh-first-error.json / production-first-error.json.
#   Raw deploy/postgres/fixture logs and fixture SQL live only in a temp dir:
#   they are extracted, scanned and DELETED; removed-raw-evidence.json records
#   every deleted raw (path, category, sha256, bytes). Passwords and
#   connection URLs are NEVER written to disk; persisted logs are defensively
#   scrubbed. No fixture raw SQL or secrets are ever persisted.
#
# ON FAILURE: the failing path stops immediately (no resolve, no retry, no
# migration modification) and persists precise first-error evidence: the
# failing migration name, SQLSTATE, bounded error message, ledger/transaction
# state (applied / unresolved failed / rolled back counts) and the postgres
# first-error signature. The runner stays reproducible: every container and
# temp dir is removed by the cleanup trap, and re-runs allocate a fresh run
# id + fresh random ports.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
FIXTURE_HELPER="$HERE/v11-p7-fixture.mjs"
MANIFEST_SQL="$HERE/f1-source-manifest.sql"
P7_EVIDENCE_HELPER="$HERE/v11-r1-p7-evidence.mjs"
F1_EVIDENCE_HELPER="$HERE/v11-r1-functional-first-evidence.mjs"

IMAGE=${VANSTRO_TEST_POSTGRES_IMAGE:-postgres:16-bookworm}
F0_SCHEMA_VERSION="v11-r1-functional-first-run-2"
RUNNER_ROLE_ATTRIBUTES="vanstro_migrator:LOGIN,NOINHERIT,NOSUPERUSER,NOCREATEDB,NOCREATEROLE,NOREPLICATION,NOBYPASSRLS;cap-role memberships WITH ADMIN OPTION;owner of database+public schema;deploys M59-bearing segments (fresh 1-69, production 1-41+42-69) as vanstro_migrator;vanstro_deployment_owner:LOGIN,SUPERUSER,NOCREATEDB,NOCREATEROLE,NOREPLICATION,NOBYPASSRLS;deployment-only admin (migrate connections only, never API/Worker);deploys 70-83 + no-op as vanstro_deployment_owner;runtime roles retained for functional permissions only;runner=prisma migrate deploy over 127.0.0.1 TCP;fixture=disposable superuser only"
EVIDENCE_ROOT=${V11_F0_EVIDENCE_ROOT:-"$ROOT/tasks/evidence/v11-r1-functional-first-migration"}
RUN_ID=${V11_F0_RUN_ID:-$(node "$F1_EVIDENCE_HELPER" run-id)}
node "$F1_EVIDENCE_HELPER" validate-run-id "$RUN_ID" || { echo "F0 runner: invalid run id '$RUN_ID'" >&2; exit 1; }
if [ -n "${V11_F0_EVIDENCE_OUT:-}" ]; then
  OUT="$V11_F0_EVIDENCE_OUT"
else
  OUT="$EVIDENCE_ROOT/runs/$RUN_ID"
fi
if [ -e "$OUT" ]; then
  echo "F0 runner: refusing existing evidence run dir: $OUT" >&2
  exit 1
fi
mkdir -p "$OUT"
TMP_ROOT=$(mktemp -d)
LOGS="$TMP_ROOT/logs"
FIXTURES="$TMP_ROOT/fixtures"
mkdir -p "$LOGS" "$FIXTURES"
RAWS="$TMP_ROOT/raw-evidence.jsonl"
: > "$RAWS"

command -v docker >/dev/null 2>&1 || { echo "F0 runner requires docker" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "F0 runner requires node" >&2; exit 1; }
if ! command -v pnpm >/dev/null 2>&1; then PATH="$HOME/.local/bin:$PATH"; fi
command -v pnpm >/dev/null 2>&1 || { echo "F0 runner requires pnpm" >&2; exit 1; }
[ -f "$FIXTURE_HELPER" ] || { echo "missing fixture helper: $FIXTURE_HELPER" >&2; exit 1; }
[ -f "$MANIFEST_SQL" ] || { echo "missing manifest sql: $MANIFEST_SQL" >&2; exit 1; }
[ -f "$P7_EVIDENCE_HELPER" ] || { echo "missing P7 evidence helper: $P7_EVIDENCE_HELPER" >&2; exit 1; }
[ -f "$F1_EVIDENCE_HELPER" ] || { echo "missing F0 evidence helper: $F1_EVIDENCE_HELPER" >&2; exit 1; }

PRISMA=(pnpm --dir "$ROOT/packages/db" exec prisma)
PRISMA_VERSION=$("${PRISMA[@]}" --version 2>/dev/null | head -n 1 || true)
GENERATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
POSTGRES_IMAGE_ID=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null | sed 's/^sha256://' || echo unknown)

MIG69="20260804100000_f1_v15_expand"
MIG70="20260804110000_f1_v15_phase_b"
MIG82="20260813000000_erp_category_mappings"
MIG83="20260813010000_price_source_and_active_uniqueness"
EXPECTED_TOTAL=83
PROD_BASELINE=41

# ---- candidate identities (Authority Gate E1; env-overridable) --------------
TESTED_CANDIDATE_KIND=${V11_F0_CANDIDATE_KIND:-working-tree}
TESTED_COMMIT=${V11_F0_TESTED_COMMIT:-$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)}
TESTED_TREE=${V11_F0_TESTED_TREE:-$(git -C "$ROOT" rev-parse 'HEAD^{tree}' 2>/dev/null || echo unknown)}
BASE_HEAD=${V11_F0_BASE_HEAD:-$TESTED_COMMIT}
BASE_TREE=${V11_F0_BASE_TREE:-$TESTED_TREE}
if [ "$TESTED_CANDIDATE_KIND" = "commit" ]; then
  ACTUAL_HEAD=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)
  ACTUAL_TREE=$(git -C "$ROOT" rev-parse 'HEAD^{tree}' 2>/dev/null || true)
  if [ -z "$ACTUAL_HEAD" ] || [ "$TESTED_COMMIT" != "$ACTUAL_HEAD" ] || [ "$TESTED_TREE" != "$ACTUAL_TREE" ]; then
    echo "F0 runner: commit-kind run must bind the actual HEAD/tree (testedCommit=$TESTED_COMMIT actual=$ACTUAL_HEAD; testedTree=$TESTED_TREE actual=$ACTUAL_TREE)" >&2
    exit 1
  fi
fi
MIGRATION69_SHA=${V11_F0_MIGRATION69_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG69/migration.sql" | cut -d' ' -f1)}
MIGRATION70_SHA=${V11_F0_MIGRATION70_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG70/migration.sql" | cut -d' ' -f1)}
MIGRATION82_SHA=${V11_F0_MIGRATION82_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG82/migration.sql" | cut -d' ' -f1)}
MIGRATION83_SHA=${V11_F0_MIGRATION83_SHA:-$(shasum -a 256 "$ROOT/packages/db/prisma/migrations/$MIG83/migration.sql" | cut -d' ' -f1)}
HARNESS_SHA=${V11_F0_HARNESS_SHA:-$(shasum -a 256 "$0" | cut -d' ' -f1)}
CONFORMANCE_SHA=${V11_F0_CONFORMANCE_SHA:-$(shasum -a 256 "$ROOT/tasks/tooling/f1-v15-clarification/owned-pg16-conformance.mjs" | cut -d' ' -f1)}

# ---- candidate manifest: canonical payload + digest (never self-containing) --
MANIFEST_ARGS=(manifest --root "$ROOT" --run-id "$RUN_ID" --generated-at "$GENERATED_AT" \
  --kind "$TESTED_CANDIDATE_KIND" --base-head "$BASE_HEAD" --base-tree "$BASE_TREE" --out "$OUT")
for spec in ${V11_F0_MANIFEST_EXTRA:-}; do MANIFEST_ARGS+=(--file="$spec"); done
# F0 adds its own runner + evidence helper + focused test to the P7 closure
MANIFEST_ARGS+=(--file=qa/v11-auth-browser/run-v11-r1-functional-first-migration.sh:harness)
MANIFEST_ARGS+=(--file=qa/v11-auth-browser/v11-r1-functional-first-evidence.mjs:harness)
MANIFEST_ARGS+=(--file=qa/v11-auth-browser/v11-r1-functional-first-evidence.test.mjs:harness)
MANIFEST_RESULT=$(node "$F1_EVIDENCE_HELPER" "${MANIFEST_ARGS[@]}")
CANDIDATE_MANIFEST_SHA=$(printf '%s' "$MANIFEST_RESULT" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.parse(d).digest))')
if [ -n "${V11_F0_CANDIDATE_MANIFEST_SHA:-}" ] && [ "$V11_F0_CANDIDATE_MANIFEST_SHA" != "$CANDIDATE_MANIFEST_SHA" ]; then
  echo "F0 runner: candidateManifestSha mismatch — expected $V11_F0_CANDIDATE_MANIFEST_SHA, computed $CANDIDATE_MANIFEST_SHA" >&2
  exit 1
fi
IDENTITY_FILE="$TMP_ROOT/identity.json"
node "$F1_EVIDENCE_HELPER" identity \
  schemaVersion="$F0_SCHEMA_VERSION" runId="$RUN_ID" generatedAt="$GENERATED_AT" \
  testedCandidateKind="$TESTED_CANDIDATE_KIND" testedCommit="$TESTED_COMMIT" testedTree="$TESTED_TREE" \
  baseHead="$BASE_HEAD" baseTree="$BASE_TREE" migration69Sha="$MIGRATION69_SHA" migration70Sha="$MIGRATION70_SHA" \
  candidateManifestSha="$CANDIDATE_MANIFEST_SHA" harnessSha="$HARNESS_SHA" conformanceSha="$CONFORMANCE_SHA" \
  postgresImage="$IMAGE" postgresImageId="$POSTGRES_IMAGE_ID" prismaVersion="$PRISMA_VERSION" \
  runnerRoleAttributes="$RUNNER_ROLE_ATTRIBUTES" > "$IDENTITY_FILE"

now_ms() { node -e 'process.stdout.write(String(Date.now()))'; }
now_iso() { node -e 'process.stdout.write(new Date().toISOString())'; }
json_enc() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }
fixture_val() { node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]])' "$1" "$2"; }
node_field() { node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(j[process.argv[1]]??""))})' "$1"; }

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

cleanup() {
  docker rm -f vanstro-v11-f0-fresh-pg >/dev/null 2>&1 || true
  docker rm -f vanstro-v11-f0-prod-pg >/dev/null 2>&1 || true
  rm -rf "$TMP_ROOT"
  unset DATABASE_URL SUPER_PASSWORD MIGRATOR_PASSWORD DEPLOY_PASSWORD FRESH_SUPER FRESH_MIGRATOR FRESH_DEPLOY PROD_SUPER PROD_MIGRATOR PROD_DEPLOY || true
}
trap cleanup EXIT

# =============================================================================
# one path: provision (admin contract A-G + GUCs) → boundary deploys via
# temporary migration views → post-69 fixture (superuser) → 70..83 full-dir
# deploy → no-op second deploy. On ANY failure: record first-error evidence
# and stop the path (no resolve, no retry, no migration modification).
# =============================================================================
run_path_flow() {
  local tag=$1 container=$2 db=$3 baseline=$4 super_pass=$5 migrator_pass=$6 deploy_pass=$7
  local dburl_migrator dburl_deploy facts segs recs failf
  local port
  facts="$LOGS/$tag-facts.jsonl"
  segs="$LOGS/$tag-segments.jsonl"
  recs="$LOGS/$tag-recoveries.jsonl"
  failf="$LOGS/$tag-failures.jsonl"
  : > "$facts"; : > "$segs"; : > "$recs"; : > "$failf"

  local SEC_NAME="" SEC_START_MS="" SEC_START_ISO=""
  seg() { SEC_NAME="$1"; SEC_START_MS=$(now_ms); SEC_START_ISO=$(now_iso); }
  seg_end() { # seg_end [appliedCount] [deployLabel]
    local end_ms end_iso dur json
    end_ms=$(now_ms); end_iso=$(now_iso)
    dur=$((end_ms - SEC_START_MS))
    json="{\"name\":\"$SEC_NAME\",\"startedAt\":\"$SEC_START_ISO\",\"endedAt\":\"$end_iso\",\"durationMs\":$dur"
    [ $# -ge 1 ] && json="$json,\"appliedCount\":$1"
    [ $# -ge 2 ] && json="$json,\"deployLabel\":\"$2\""
    printf '%s}\n' "$json" >> "$segs"
  }
  record_fact() { printf '{"key":"%s","value":%s}\n' "$1" "$2" >> "$facts"; }
  record_assert() { # record_assert <key> <expected> <actual>
    local pass="true"
    [ "$2" = "$3" ] || pass="false"
    printf '{"key":"assert:%s","value":{"expected":%s,"actual":%s,"pass":%s}}\n' \
      "$1" "$(json_enc "$2")" "$(json_enc "$3")" "$pass" >> "$facts"
  }
  record_failure() { # record_failure <migration> <sqlState> <message> <deployLabel> <ledgerJson>
    printf '{"migration":%s,"sqlState":%s,"message":%s,"deployLabel":%s,"ledger":%s,"recordedAt":%s}\n' \
      "$(json_enc "$1")" "$(json_enc "$2")" "$(json_enc "$3")" "$(json_enc "$4")" "$5" "$(json_enc "$(now_iso)")" >> "$failf"
  }

  psql_super() {
    docker exec -i -e PGPASSWORD="$super_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
      -v f0_db="$db" -v f0_migrator_pass="$migrator_pass" -v f0_deploy_pass="$deploy_pass" -U postgres -d "$db" "$@"
  }
  psql_migrator() {
    docker exec -i -e PGPASSWORD="$migrator_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
      -v f0_db="$db" -v f0_migrator_pass="$migrator_pass" -U vanstro_migrator -d "$db" "$@"
  }
  q_super() { docker exec -e PGPASSWORD="$super_pass" "$container" psql -X -t -A -U postgres -d "$db" -c "$1"; }
  applied_count_f0() { q_super "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"; }

  ledger_counts() { # -> "applied,unresolved,rolledback"
    q_super "SELECT (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)||','||(SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL)||','||(SELECT count(*) FROM _prisma_migrations WHERE rolled_back_at IS NOT NULL)"
  }
  failed_list() { q_super "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at"; }

  make_view() { # make_view <label> <first> <last>  → writes $TMP_ROOT/$tag-$label-prisma
    local label=$1 first=$2 last=$3 schema_dir i migration
    schema_dir="$TMP_ROOT/$tag-$label-prisma"
    rm -rf "$schema_dir"
    mkdir -p "$schema_dir/migrations"
    cp "$ROOT/packages/db/prisma/schema.prisma" "$schema_dir/schema.prisma"
    cp "$ROOT/packages/db/prisma/migrations/migration_lock.toml" "$schema_dir/migrations/migration_lock.toml"
    i=0
    for migration in "$ROOT/packages/db/prisma/migrations"/*; do
      [ -d "$migration" ] || continue
      i=$((i + 1))
      [ "$i" -ge "$first" ] || continue
      [ "$i" -le "$last" ] || break
      cp -R "$migration" "$schema_dir/migrations/$(basename "$migration")"
    done
    if [ "$i" -lt "$last" ]; then
      echo "make_view($label): expected migrations up to #$last, saw only $i" >&2
      return 1
    fi
    echo "$schema_dir"
  }

  deploy_pass() { # deploy_pass <label> <schemaDir> <dburl>; writes $LOGS/$tag-<label>.log, sets DEPLOY_RC
    local logf="$LOGS/$tag-$1.log"
    set +e
    DATABASE_URL="$3" "${PRISMA[@]}" migrate deploy --schema "$2/schema.prisma" >"$logf" 2>&1
    DEPLOY_RC=$?
    set -e
    track_raw "logs/$tag-$1.log" deploy-log "$logf"
    sanitize_file "$logf"
  }

  ledger_snapshot() { # -> json {"applied":N,"unresolvedFailed":N,"rolledBack":N}
    local counts app un res
    counts=$(ledger_counts)
    app=${counts%%,*}; counts=${counts#*,}
    un=${counts%%,*}; res=${counts#*,}
    printf '{"applied":%s,"unresolvedFailed":%s,"rolledBack":%s}' "$app" "$un" "$res"
  }

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

  handle_deploy_failure() { # handle_deploy_failure <label> <schemaDir> <expectedApplied> -> stops path
    local label=$1 schema_dir=$2 expected_applied=$3
    local fail_mig fail_list snap first_json counts ledger_json
    fail_list=$(failed_list | tr -d ' \n')
    fail_mig=${fail_list%%$'\n'*}
    [ -n "$fail_mig" ] || fail_mig="UNKNOWN"
    extract_error "$fail_mig"
    counts=$(ledger_counts)
    ledger_json=$(ledger_snapshot)
    local snap_log
    snap_log="$LOGS/$tag-postgres-$label.log"
    docker logs "$container" > "$snap_log" 2>&1 || true
    track_raw "logs/$tag-postgres-$label.log" postgres-log "$snap_log"
    sanitize_file "$snap_log"
    first_json=$(node "$F1_EVIDENCE_HELPER" extract-first-error --log "$snap_log" --start "$SEC_START_ISO" --end "$(now_iso)" 2>/dev/null || true)
    if [ -z "$first_json" ] || [ "$first_json" = "null" ]; then
      first_json='{"sqlState":"UNKNOWN","message":"","statement":"","firstErrorSignature":"","query":"","context":""}'
    fi
    # prisma's engine does not always persist the failing SQL in
    # _prisma_migrations.logs; when it is missing, merge the authoritative
    # SQLSTATE/message extracted from the postgres log into the record.
    if [ "$ERROR_STATE" = "UNKNOWN" ] || [ -z "$ERROR_MSG" ]; then
      local fj_state fj_msg
      fj_state=$(printf '%s' "$first_json" | node_field sqlState)
      fj_msg=$(printf '%s' "$first_json" | node_field message)
      [ "$ERROR_STATE" = "UNKNOWN" ] && [ "$fj_state" != "UNKNOWN" ] && ERROR_STATE="$fj_state"
      [ -z "$ERROR_MSG" ] && [ -n "$fj_msg" ] && ERROR_MSG="$fj_msg"
    fi
    record_failure "$fail_mig" "$ERROR_STATE" "$ERROR_MSG" "$label" "$ledger_json"
    record_fact "firstError" "$first_json"
    printf '%s\n' "$first_json" > "$LOGS/$tag-first-error.json"
    record_fact "ledger.applied" "$(printf '%s' "$ledger_json" | node_field applied)"
    record_fact "ledger.unresolvedFailed" "$(printf '%s' "$ledger_json" | node_field unresolvedFailed)"
    record_fact "ledger.rolledBack" "$(printf '%s' "$ledger_json" | node_field rolledBack)"
    record_fact "aborted" "$(json_enc "deploy $label failed rc=$DEPLOY_RC migration=$fail_mig sqlState=$ERROR_STATE ledger=$counts (expected applied=$expected_applied)")"
    seg_end "$(printf '%s' "$ledger_json" | node_field applied)" "$label"
    return 1
  }

  record_fact "image" "$(json_enc "$IMAGE")"
  record_fact "prismaVersion" "$(json_enc "$PRISMA_VERSION")"
  record_fact "testedCommit" "$(json_enc "$TESTED_COMMIT")"
  record_fact "testedTree" "$(json_enc "$TESTED_TREE")"
  record_fact "generatedAt" "$(json_enc "$GENERATED_AT")"
  record_fact "baselineTarget" "$baseline"
  record_fact "migration69Sha" "$(json_enc "$MIGRATION69_SHA")"
  record_fact "migration70Sha" "$(json_enc "$MIGRATION70_SHA")"
  record_fact "migration82Sha" "$(json_enc "$MIGRATION82_SHA")"
  record_fact "migration83Sha" "$(json_enc "$MIGRATION83_SHA")"

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
  # M59-bearing boundary segments authenticate AS vanstro_migrator (migration
  # 59 hard-asserts session identity); 70..83 + no-op deploy as the
  # deployment-only admin (SUPERUSER in this disposable PG16, migrate-only).
  dburl_migrator="postgresql://vanstro_migrator:${migrator_pass}@127.0.0.1:${port}/${db}?schema=public"
  dburl_deploy="postgresql://vanstro_deployment_owner:${deploy_pass}@127.0.0.1:${port}/${db}?schema=public"

  psql_super >/dev/null <<'SQL'
-- A. role topology: exact attributes are asserted by migration 59
--    (p07_media_role_boundary) and 69 BEFORE those migrations run — a
--    migration cannot bootstrap the principals it executes as, so this is an
--    out-of-migration admin action. vanstro_crypto_verifier_owner is the
--    owner of the external crypto verifier preset (block E) that migration
--    70 invokes at deploy time.
CREATE ROLE vanstro_migrator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
-- Deployment-only admin: runs the 70..83 and no-op prisma migrate deploy
-- connections (SUPERUSER in this disposable PG16 so M74's CREATE OR REPLACE
-- on guard-owned s01_settings_* functions succeeds; migrate-only, never
-- API/Worker).
CREATE ROLE vanstro_deployment_owner LOGIN NOINHERIT SUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
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
ALTER DATABASE :"f0_db" OWNER TO vanstro_migrator;
ALTER SCHEMA public OWNER TO vanstro_migrator;
-- C. CREATE revocation: migration 59 ASSERTS (before re-revoking) that PUBLIC
--    and vanstro_runtime lack CREATE on database and public schema; migration
--    69 additionally revokes vanstro_worker_runtime. Prior state, hence an
--    out-of-migration admin action.
REVOKE CREATE ON DATABASE :"f0_db" FROM PUBLIC,vanstro_runtime,vanstro_worker_runtime;
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
--    tree. KAT-only allowlist here; the post-69 fixture step ORs in the
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
-- migrator + deployment-owner login credentials (used by psql provisioning
-- and the prisma deploy connections; the 70..83 + no-op deploys authenticate
-- as the deployment owner over TCP)
ALTER ROLE vanstro_migrator PASSWORD :'f0_migrator_pass';
ALTER ROLE vanstro_deployment_owner PASSWORD :'f0_deploy_pass';
SQL

  local role_count
  role_count=$(q_super "SELECT count(*) FROM pg_roles WHERE rolname IN ('vanstro_migrator','vanstro_deployment_owner','vanstro_runtime','vanstro_worker_runtime','vanstro_media_guard_owner','vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p08_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner','vanstro_crypto_verifier_owner','vanstro_worker_lifecycle_cap','vanstro_p10_release_cap','vanstro_p10_signer_admin_cap','vanstro_p10_kms_rotation_cap','vanstro_p10_dsar_cap','vanstro_signer_admin_runtime','vanstro_kms_rotation_runtime','vanstro_dsar_runtime','vanstro_telemetry_runtime')")
  record_assert "provision.roles" "22" "$role_count"

  # ---- early fixture: fixed rollout per path; carries the DETERMINISTIC
  #      manifest digest used by block G audit + block F GUCs. The final
  #      fixture is REGENERATED with the same rollout id right before apply
  #      (attestation observedAt must land inside the consume window).
  local early_json early_sql
  early_json="$FIXTURES/fixture-$tag-early-rollout.json"
  node "$FIXTURE_HELPER" --root "$ROOT" --out "$FIXTURES" --tag "$tag" \
    --rollout "rollout-$tag-f0" > "$early_json" 2>/dev/null || {
    record_fact "aborted" "$(json_enc 'early fixture generation failed')"; seg_end; return 1; }
  track_raw "fixtures/fixture-$tag-early-rollout.json" fixture-json "$early_json"
  early_sql="$FIXTURES/fixture-$tag-rollout-$tag-f0.sql"
  track_raw "fixtures/fixture-$tag-early-rollout.sql" fixture-sql-early "$early_sql"
  local manifest_digest rollout_id
  manifest_digest=$(fixture_val "$early_json" manifestDigest)
  rollout_id=$(fixture_val "$early_json" rolloutId)

  # F. ALTER DATABASE GUCs: migration 70 reads these via current_setting() on
  #    every deploy connection; only database-level SET survives the runner's
  #    fresh sessions — another out-of-migration admin action. (GUCs persist
  #    per-database and create no schema objects, so they are safe before the
  #    first deploy; the block-G TABLES cannot be — see the P3005 note above.)
  psql_super -v f0_rollout="$rollout_id" -v f0_env="test" -v f0_digest="$manifest_digest" >/dev/null <<'SQL'
ALTER DATABASE :"f0_db" SET vanstro.rollout_id TO :'f0_rollout';
ALTER DATABASE :"f0_db" SET vanstro.environment TO :'f0_env';
ALTER DATABASE :"f0_db" SET vanstro.manifest_digest TO :'f0_digest';
SQL
  record_fact "fixture.rolloutId" "$(json_enc "$rollout_id")"
  record_fact "fixture.manifestDigest" "$(json_enc "$manifest_digest")"
  seg_end

  # ---- boundary deploys via temporary migration views ----------------------
  # fresh:            deploy 1..68 → (manifest) → deploy 69
  # production-equiv: deploy 1..41 → (manifest) → deploy 42..69
  # (block G runs between the two boundary deploys: see the P3005 note)
  local boundary_first boundary_first_expected boundary_second boundary_second_expected
  if [ "$baseline" -gt 0 ]; then
    boundary_first="deploy-1-41"; boundary_first_expected=41
    boundary_second="deploy-42-69"; boundary_second_expected=69
  else
    boundary_first="deploy-1-68"; boundary_first_expected=68
    boundary_second="deploy-69"; boundary_second_expected=69
  fi
  seg "$boundary_first"
  local b_view
  b_view=$(make_view "${boundary_first#deploy-}" 1 "$boundary_first_expected") || { record_fact "aborted" "$(json_enc "make_view $boundary_first failed")"; seg_end; return 1; }
  deploy_pass "$boundary_first" "$b_view" "$dburl_migrator"
  record_fact "$boundary_first.identity" "$(json_enc "vanstro_migrator (M59 session assertion)")"
  local b_applied
  b_applied=$(applied_count_f0)
  record_fact "$boundary_first.rc" "$DEPLOY_RC"
  record_fact "$boundary_first.applied" "$b_applied"
  record_assert "$boundary_first.rc" "0" "$DEPLOY_RC"
  record_assert "$boundary_first.applied" "$boundary_first_expected" "$b_applied"
  if [ "$DEPLOY_RC" -ne 0 ] || [ "$b_applied" -ne "$boundary_first_expected" ]; then
    handle_deploy_failure "$boundary_first" "$b_view" "$boundary_first_expected" || return 1
  fi
  seg_end "$b_applied" "$boundary_first"

  # ---- block G: manifest + bootstrap audit (post-boundary, PRE-69) ----------
  # G. manifest + bootstrap audit created AS vanstro_migrator: migration 69
  #    ALTERs the OWNER of both tables to vanstro_migrator (a privilege only
  #    the owner or a superuser holds) — pre-creating them as migrator is the
  #    out-of-migration admin contract the migration asserts. Placed AFTER
  #    the first boundary deploy so prisma's P3005 baseline guard (empty
  #    ledger + non-empty schema) never fires, and BEFORE migration 69 runs.
  seg "provision-manifest"
  psql_migrator -v f0_digest="$manifest_digest" >/dev/null <<'SQL'
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
VALUES ('bootstrap','roles/source manifest (68 rows)','vanstro_migrator', :'f0_digest');
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
  seg_end

  # ---- second boundary deploy: migration 69 (fresh) or 42..69 (production) --
  seg "$boundary_second"
  local s_view
  if [ "$baseline" -gt 0 ]; then
    s_view=$(make_view "${boundary_second#deploy-}" 42 69) || { record_fact "aborted" "$(json_enc "make_view $boundary_second failed")"; seg_end; return 1; }
  else
    s_view=$(make_view "69" 69 69) || { record_fact "aborted" "$(json_enc "make_view $boundary_second failed")"; seg_end; return 1; }
  fi
  deploy_pass "$boundary_second" "$s_view" "$dburl_migrator"
  record_fact "$boundary_second.identity" "$(json_enc "vanstro_migrator (M59 session assertion)")"
  local s_applied
  s_applied=$(applied_count_f0)
  record_fact "$boundary_second.rc" "$DEPLOY_RC"
  record_fact "$boundary_second.applied" "$s_applied"
  record_assert "$boundary_second.rc" "0" "$DEPLOY_RC"
  record_assert "$boundary_second.applied" "$boundary_second_expected" "$s_applied"
  if [ "$DEPLOY_RC" -ne 0 ] || [ "$s_applied" -ne "$boundary_second_expected" ]; then
    handle_deploy_failure "$boundary_second" "$s_view" "$boundary_second_expected" || return 1
  fi
  seg_end "$s_applied" "$boundary_second"

  # ---- post-69 fixture: REGENERATE with the SAME rollout id (fresh
  #      attestation timestamps), apply AS THE DISPOSABLE SUPERUSER only —
  #      the runner never provisions fixture rows as the deploy admin.
  seg fixture
  local final_sql fixture_log
  final_sql="$FIXTURES/fixture-$tag-final-$rollout_id.sql"
  node "$FIXTURE_HELPER" --root "$ROOT" --out "$FIXTURES" --tag "$tag" \
    --rollout "$rollout_id" > /dev/null
  mv "$FIXTURES/fixture-$tag-$rollout_id.sql" "$final_sql"
  mv "$FIXTURES/fixture-$tag-$rollout_id.json" "$FIXTURES/fixture-$tag-final.json"
  local final_digest
  final_digest=$(fixture_val "$FIXTURES/fixture-$tag-final.json" manifestDigest)
  record_assert "fixture.digestStable" "$manifest_digest" "$final_digest"
  track_raw "fixtures/fixture-$tag-final-$rollout_id.sql" fixture-sql "$final_sql"
  track_raw "fixtures/fixture-$tag-final.json" fixture-json "$FIXTURES/fixture-$tag-final.json"
  fixture_log="$LOGS/$tag-fixture-apply.log"
  set +e
  docker exec -i -e PGPASSWORD="$super_pass" "$container" psql -X -v ON_ERROR_STOP=1 \
    -U postgres -d "$db" < "$final_sql" > "$fixture_log" 2>&1
  local fixture_rc=$?
  set -e
  track_raw "logs/$tag-fixture-apply.log" fixture-log "$fixture_log"
  sanitize_file "$fixture_log"
  record_fact "fixture.applyRc" "$fixture_rc"
  record_assert "fixture.applyRc" "0" "$fixture_rc"
  if [ "$fixture_rc" -ne 0 ]; then
    local fx_state fx_msg
    fx_state=$(grep -oE 'SQLSTATE[=: ]+[0-9A-Z]{5}' "$fixture_log" | head -n 1 | grep -oE '[0-9A-Z]{5}$' || true)
    if [ -z "$fx_state" ]; then fx_state=$(grep -oE '\bP[0-9]{4}\b' "$fixture_log" | head -n 1 || true); fi
    fx_state=${fx_state:-UNKNOWN}
    fx_msg=$(grep -m1 '^ERROR' "$fixture_log" | cut -c1-300 || true)
    record_failure "fixture-apply" "$fx_state" "$fx_msg" "fixture" "$(ledger_snapshot)"
    record_fact "aborted" "$(json_enc "post-69 superuser fixture apply failed rc=$fixture_rc sqlState=$fx_state")"
    seg_end
    return 1
  fi
  local telemetry_rows
  telemetry_rows=$(q_super "SELECT count(*) FROM public.f1_old_function_call_telemetry")
  record_fact "fixture.telemetryRows" "$telemetry_rows"
  record_assert "fixture.telemetryRows" "31" "$telemetry_rows"

  # ---- post-69 schema CREATE re-grant (out-of-migration admin contract,
  #      functional-first F1): migration 69 ends by revoking CREATE ON SCHEMA
  #      public from the guard-owner roles (zero-CREATE closure). Migrations
  #      71/72 then run AS vanstro_migrator and ALTER FUNCTION ... OWNER TO
  #      <guard owner> — PostgreSQL requires the NEW owner to hold CREATE on
  #      the function's schema, so the deploy-time admin re-establishes the
  #      schema CREATE closure for the guard owners between migration 69 and
  #      the 70..83 deploy. Mirrors block G's pre-69 grant; without it the
  #      70..83 deploy fails on migration 71 with
  #      "permission denied for schema public".
  psql_super >/dev/null <<'SQL'
GRANT USAGE,CREATE ON SCHEMA public TO vanstro_p02_guard_owner,vanstro_p04_guard_owner,vanstro_p09_guard_owner,vanstro_p10_guard_owner,vanstro_p10_dsar_guard_owner,vanstro_telemetry_guard_owner;
SQL
  record_assert "post69.schemaCreateOwners" "6" "$(q_super "SELECT count(*) FROM pg_roles WHERE rolname IN('vanstro_p02_guard_owner','vanstro_p04_guard_owner','vanstro_p09_guard_owner','vanstro_p10_guard_owner','vanstro_p10_dsar_guard_owner','vanstro_telemetry_guard_owner') AND has_schema_privilege(rolname,'public','CREATE')")"
  seg_end

  # ---- dedup/backfill seed (post-69, superuser ONLY, both paths): one
  #      category/product/sku plus THREE duplicate status='active' prices for
  #      the same (skuId,currency) so migration 83's backfill has real
  #      duplicate rows to archive before the partial unique index is built.
  #      Keeper expected: newest by (effectiveFrom DESC NULLS LAST, updatedAt
  #      DESC, id DESC) = the 2026-06-01 row (…12); rows …11/…13 must be
  #      ARCHIVED (never deleted). The category row is reused by the
  #      migration-82 FK RESTRICT check after the deploy.
  seg seed-dedup
  psql_super -v f0_seed_tag="$tag" >/dev/null <<'SQL'
INSERT INTO categories (id, slug, name, "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000001', 'seed-cat-' || :'f0_seed_tag', 'Seed Category ' || :'f0_seed_tag', CURRENT_TIMESTAMP);
INSERT INTO products (id, slug, name, "categoryId", status, "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000002', 'seed-prod-' || :'f0_seed_tag', 'Seed Product ' || :'f0_seed_tag', '00000000-0000-4000-8000-000000000001', 'active', CURRENT_TIMESTAMP);
INSERT INTO platform_skus (id, "productId", "skuCode", name, status, "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'SEED-SKU-' || upper(:'f0_seed_tag'), 'Seed SKU ' || :'f0_seed_tag', 'active', CURRENT_TIMESTAMP);
INSERT INTO prices (id, key, "skuId", currency, "amountCents", "compareAtCents", status, "effectiveFrom", "effectiveUntil", "createdAt", "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000011', 'seed-price-' || :'f0_seed_tag' || '-1', '00000000-0000-4000-8000-000000000003', 'CAD', 1000, 1200, 'active', '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '3 days'),
 ('00000000-0000-4000-8000-000000000012', 'seed-price-' || :'f0_seed_tag' || '-2', '00000000-0000-4000-8000-000000000003', 'CAD', 1100, 1300, 'active', '2026-06-01T00:00:00Z', '2026-12-31T00:00:00Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 days'),
 ('00000000-0000-4000-8000-000000000013', 'seed-price-' || :'f0_seed_tag' || '-3', '00000000-0000-4000-8000-000000000003', 'CAD', 1200, 1400, 'active', '2026-03-01T00:00:00Z', '2026-12-31T00:00:00Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 day');
SQL
  local seed_active
  seed_active=$(q_super "SELECT count(*) FROM prices WHERE \"skuId\"='00000000-0000-4000-8000-000000000003' AND status='active'")
  record_fact "seed.duplicateActive" "$seed_active"
  record_assert "seed.duplicateActive" "3" "$seed_active"
  if [ "$seed_active" -ne 3 ]; then
    record_fact "aborted" "$(json_enc "dedup seed failed: expected 3 active rows, saw $seed_active")"; seg_end; return 1
  fi
  seg_end

  # ---- full-dir deploy 70..83 (deployment-only admin, real prisma migrate
  #      deploy) — SUPERUSER session makes M74's CREATE OR REPLACE on
  #      guard-owned s01_settings_* functions succeed ----------------------
  seg "deploy-70-83"
  deploy_pass "deploy-70-83" "$ROOT/packages/db/prisma" "$dburl_deploy"
  record_fact "deploy-70-83.identity" "$(json_enc "vanstro_deployment_owner (deployment-only admin, migrate-only)")"
  local a83 consumed
  a83=$(applied_count_f0)
  consumed=$(q_super "SELECT count(*) FROM public.f1_deployment_attestation_consumption")
  record_fact "deploy-70-83.rc" "$DEPLOY_RC"
  record_fact "deploy-70-83.applied" "$a83"
  record_fact "fixture.consumed" "$consumed"
  record_assert "deploy-70-83.rc" "0" "$DEPLOY_RC"
  record_assert "deploy-70-83.applied" "83" "$a83"
  record_assert "fixture.consumed" "1" "$consumed"
  if [ "$DEPLOY_RC" -ne 0 ] || [ "$a83" -ne 83 ] || [ "$consumed" -ne 1 ]; then
    handle_deploy_failure "deploy-70-83" "$ROOT/packages/db/prisma" 83 || return 1
  fi
  seg_end "$a83" "deploy-70-83"

  # ---- no-op second deploy (same deployment-only admin): must succeed with
  #      NOTHING pending ----------------------------------------------------
  seg "deploy-noop"
  deploy_pass "deploy-noop" "$ROOT/packages/db/prisma" "$dburl_deploy"
  record_fact "deploy-noop.identity" "$(json_enc "vanstro_deployment_owner (deployment-only admin, migrate-only)")"
  local a_noop noop_json noop_text
  a_noop=$(applied_count_f0)
  noop_json=$(node "$F1_EVIDENCE_HELPER" noop --log "$LOGS/$tag-deploy-noop.log")
  noop_text=$(printf '%s' "$noop_json" | node_field text)
  record_fact "deploy-noop.rc" "$DEPLOY_RC"
  record_fact "deploy-noop.applied" "$a_noop"
  record_fact "noop.text" "$(json_enc "$noop_text")"
  record_fact "noop.boundedLog" "$(json_enc "$tag-noop.log")"
  record_assert "deploy-noop.rc" "0" "$DEPLOY_RC"
  record_assert "deploy-noop.applied" "83" "$a_noop"
  record_assert "noop.text" "nonzero" "$([ -n "$noop_text" ] && echo nonzero || echo zero)"
  if [ "$DEPLOY_RC" -ne 0 ] || [ "$a_noop" -ne 83 ] || [ -z "$noop_text" ]; then
    handle_deploy_failure "deploy-noop" "$ROOT/packages/db/prisma" 83 || return 1
  fi
  seg_end "$a_noop" "deploy-noop"

  # ---- final ledger + functional impact ------------------------------------
  local counts ledger_json
  counts=$(ledger_counts)
  ledger_json=$(ledger_snapshot)
  record_fact "ledger.applied" "$(printf '%s' "$ledger_json" | node_field applied)"
  record_fact "ledger.unresolvedFailed" "$(printf '%s' "$ledger_json" | node_field unresolvedFailed)"
  record_fact "ledger.rolledBack" "$(printf '%s' "$ledger_json" | node_field rolledBack)"
  record_assert "ledger.applied" "83" "$(printf '%s' "$ledger_json" | node_field applied)"
  record_assert "ledger.unresolvedFailed" "0" "$(printf '%s' "$ledger_json" | node_field unresolvedFailed)"
  record_assert "ledger.rolledBack" "0" "$(printf '%s' "$ledger_json" | node_field rolledBack)"
  local consumed_reports
  consumed_reports=$(q_super "SELECT count(*) FROM public.f1_old_call_report WHERE \"consumedAt\" IS NOT NULL")
  record_fact "fixture.consumedReports" "$consumed_reports"
  record_assert "fixture.consumedReports" "1" "$consumed_reports"
  record_fact "ledger.counts" "$(json_enc "$counts")"

  # ---- 82/83 constraints + dedup/backfill verification ----------------------
  # migration 82: erp_category_mappings table, PK, both UNIQUE indexes and the
  # FK with ON DELETE RESTRICT (confdeltype 'r')
  local m82_tbl m82_pk m82_uniq m82_fk
  m82_tbl=$(q_super "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='erp_category_mappings' AND c.relkind='r'")
  m82_pk=$(q_super "SELECT count(*) FROM pg_constraint WHERE conname='erp_category_mappings_pkey' AND contype='p'")
  m82_uniq=$(q_super "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='erp_category_mappings' AND indexname IN ('erp_category_mappings_erpSystem_erpCategoryKey_key','erp_category_mappings_categoryId_erpSystem_key')")
  m82_fk=$(q_super "SELECT count(*) FROM pg_constraint WHERE conname='erp_category_mappings_categoryId_fkey' AND contype='f' AND confdeltype='r'")
  record_fact "m82.table" "$m82_tbl"
  record_fact "m82.pk" "$m82_pk"
  record_fact "m82.uniqueIndexes" "$m82_uniq"
  record_fact "m82.fkRestrict" "$m82_fk"
  record_assert "m82.table" "1" "$m82_tbl"
  record_assert "m82.pk" "1" "$m82_pk"
  record_assert "m82.uniqueIndexes" "2" "$m82_uniq"
  record_assert "m82.fkRestrict" "1" "$m82_fk"
  # migration 83: source/externalVersion/sourceUpdatedAt columns, source CHECK
  # and the PARTIAL unique index (indpred IS NOT NULL, indisunique)
  local m83_cols m83_src_def m83_check m83_idx
  m83_cols=$(q_super "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name IN ('source','externalVersion','sourceUpdatedAt')")
  m83_src_def=$(q_super "SELECT column_default || '|' || is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='source'")
  m83_check=$(q_super "SELECT count(*) FROM pg_constraint WHERE conname='prices_source_check' AND contype='c'")
  m83_idx=$(q_super "SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='prices_single_active_sku_currency_idx' AND i.indisunique AND i.indpred IS NOT NULL")
  record_fact "m83.columns" "$m83_cols"
  record_fact "m83.sourceDefault" "$(json_enc "$m83_src_def")"
  record_fact "m83.sourceCheck" "$m83_check"
  record_fact "m83.partialUniqueIndex" "$m83_idx"
  record_assert "m83.columns" "3" "$m83_cols"
  record_assert "m83.sourceDefault" "'vanstro'::text|NO" "$m83_src_def"
  record_assert "m83.sourceCheck" "1" "$m83_check"
  record_assert "m83.partialUniqueIndex" "1" "$m83_idx"
  # dedup/backfill outcome on the seeded group: no physical delete (3 rows),
  # exactly ONE active row left = the 2026-06-01 keeper, two rows archived
  local dd_total dd_active dd_archived dd_keeper
  dd_total=$(q_super "SELECT count(*) FROM prices WHERE \"skuId\"='00000000-0000-4000-8000-000000000003'")
  dd_active=$(q_super "SELECT count(*) FROM prices WHERE \"skuId\"='00000000-0000-4000-8000-000000000003' AND status='active'")
  dd_archived=$(q_super "SELECT count(*) FROM prices WHERE \"skuId\"='00000000-0000-4000-8000-000000000003' AND status='archived'")
  dd_keeper=$(q_super "SELECT id FROM prices WHERE \"skuId\"='00000000-0000-4000-8000-000000000003' AND status='active'")
  record_fact "dedup.totalKept" "$dd_total"
  record_fact "dedup.active" "$dd_active"
  record_fact "dedup.archived" "$dd_archived"
  record_fact "dedup.keeper" "$(json_enc "$dd_keeper")"
  record_assert "dedup.totalKept" "3" "$dd_total"
  record_assert "dedup.active" "1" "$dd_active"
  record_assert "dedup.archived" "2" "$dd_archived"
  record_assert "dedup.keeper" "00000000-0000-4000-8000-000000000012" "$dd_keeper"
  # negative enforcement: a second status='active' insert must hit
  # unique_violation (23505) on the partial index; a bogus source must hit
  # check_violation (23514); the erp_category_mappings FK must RESTRICT a
  # category delete after a valid mapping row was accepted (23503)
  local neg_active neg_check neg_map_rows neg_fk
  neg_active=$(q_super "DO \$\$ BEGIN
    INSERT INTO prices (id,key,\"skuId\",currency,\"amountCents\",status,\"createdAt\",\"updatedAt\")
    VALUES ('00000000-0000-4000-8000-000000000014','seed-price-$tag-neg-active','00000000-0000-4000-8000-000000000003','CAD',1300,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'DEDUP_NEG_MISSING_VIOLATION';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'DEDUP_NEG_OK_23505';
  END \$\$;" 2>&1 || true)
  record_fact "dedup.negActiveUnique" "$(printf '%s' "$neg_active" | grep -c 'DEDUP_NEG_OK_23505' || true)"
  record_assert "dedup.negActiveUnique" "1" "$(printf '%s' "$neg_active" | grep -c 'DEDUP_NEG_OK_23505' || true)"
  neg_check=$(q_super "DO \$\$ BEGIN
    INSERT INTO prices (id,key,\"skuId\",currency,\"amountCents\",status,source,\"createdAt\",\"updatedAt\")
    VALUES ('00000000-0000-4000-8000-000000000015','seed-price-$tag-neg-source','00000000-0000-4000-8000-000000000003','EUR',1300,'active','bogus',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'DEDUP_NEG_MISSING_VIOLATION';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'DEDUP_NEG_OK_23514';
  END \$\$;" 2>&1 || true)
  record_fact "dedup.negSourceCheck" "$(printf '%s' "$neg_check" | grep -c 'DEDUP_NEG_OK_23514' || true)"
  record_assert "dedup.negSourceCheck" "1" "$(printf '%s' "$neg_check" | grep -c 'DEDUP_NEG_OK_23514' || true)"
  psql_super -v f0_seed_tag="$tag" >/dev/null <<'SQL'
INSERT INTO erp_category_mappings (id, "erpSystem", "erpCategoryKey", "erpCategoryId", "categoryId", "createdAt", "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000021', 'netSuite', 'seed-key-' || :'f0_seed_tag', 424242, '00000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
SQL
  neg_map_rows=$(q_super "SELECT count(*) FROM erp_category_mappings WHERE \"categoryId\"='00000000-0000-4000-8000-000000000001'")
  record_fact "m82.mappingRowAccepted" "$neg_map_rows"
  record_assert "m82.mappingRowAccepted" "1" "$neg_map_rows"
  neg_fk=$(q_super "DO \$\$ BEGIN
    DELETE FROM categories WHERE id='00000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'DEDUP_NEG_MISSING_VIOLATION';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'DEDUP_NEG_OK_23503';
  END \$\$;" 2>&1 || true)
  record_fact "m82.negFkRestrict" "$(printf '%s' "$neg_fk" | grep -c 'DEDUP_NEG_OK_23503' || true)"
  record_assert "m82.negFkRestrict" "1" "$(printf '%s' "$neg_fk" | grep -c 'DEDUP_NEG_OK_23503' || true)"
  record_fact "ledger.counts" "$(json_enc "$counts")"
  return 0
}

run_path() { # run_path <tag> <container> <db> <baseline>
  local tag=$1 container=$2 db=$3 baseline=$4
  local super_pass migrator_pass deploy_pass rc verdict
  super_pass="f0-super-${tag}-$(date +%s)"
  migrator_pass="f0-migrator-${tag}-$(date +%s)"
  deploy_pass="f0-deploy-${tag}-$(date +%s)"
  set +e
  ( set -e; run_path_flow "$tag" "$container" "$db" "$baseline" "$super_pass" "$migrator_pass" "$deploy_pass" )
  rc=$?
  docker logs "$container" > "$LOGS/$tag-postgres.log" 2>&1 || true
  track_raw "logs/$tag-postgres.log" postgres-log "$LOGS/$tag-postgres.log"
  sanitize_file "$LOGS/$tag-postgres.log"
  set -e
  node "$F1_EVIDENCE_HELPER" assemble-path "$OUT" "$LOGS" "$tag" "$container" "$db" "$rc" "$IDENTITY_FILE" "$EXPECTED_TOTAL"
  verdict=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).verdict)' "$OUT/$tag.json")
  if [ "$verdict" = "SUCCESS" ]; then
    return 0
  fi
  return 1
}

# =============================================================================
# run both paths (fresh 1→69, production 1→41→69) — each must END at 83 with a
# no-op second deploy
# =============================================================================
FRESH_RC=0
PROD_RC=0
run_path fresh vanstro-v11-f0-fresh-pg vanstro_f0_fresh 0 || FRESH_RC=$?
run_path production vanstro-v11-f0-prod-pg vanstro_f0_prod 41 || PROD_RC=$?

# ---- bounded no-op logs (one per path, sanitized, identity-headed) ----------
for tag in fresh production; do
  if [ -f "$LOGS/$tag-deploy-noop.log" ]; then
    {
      echo "# V11-R1 Functional-First F0 — $tag no-op deploy log (bounded tail, sanitized)"
      echo "# runId=$RUN_ID harnessSha=$HARNESS_SHA migration69Sha=$MIGRATION69_SHA migration70Sha=$MIGRATION70_SHA migration82Sha=$MIGRATION82_SHA migration83Sha=$MIGRATION83_SHA"
      tail -n 25 "$LOGS/$tag-deploy-noop.log"
    } > "$OUT/$tag-noop.log"
  fi
done

# ---- first-error evidence (failure paths only) ------------------------------
for tag in fresh production; do
  if [ -f "$LOGS/$tag-first-error.json" ] && [ ! -f "$OUT/$tag-first-error.json" ]; then
    cp "$LOGS/$tag-first-error.json" "$OUT/$tag-first-error.json"
  fi
done

# ---- removed-raw-evidence: every raw log/fixture recorded, then deleted ------
node "$F1_EVIDENCE_HELPER" removed --records "$RAWS" --run-id "$RUN_ID" --out "$OUT/removed-raw-evidence.json"

# ---- summary: overall SUCCESS requires BOTH paths SUCCESS --------------------
SUMMARY_RESULT=$(node "$F1_EVIDENCE_HELPER" summary \
  --fresh "$OUT/fresh.json" --production "$OUT/production.json" \
  --identity "$IDENTITY_FILE" --generated-at "$GENERATED_AT" --evidence-dir "$OUT")
SUMMARY_OVERALL=$(printf '%s' "$SUMMARY_RESULT" | node_field overall)
SUMMARY_EXIT=$(printf '%s' "$SUMMARY_RESULT" | node_field exitCode)

if [ "$SUMMARY_OVERALL" = "SUCCESS" ]; then
  echo "F0_FUNCTIONAL_FIRST_SUCCEEDED fresh_rc=$FRESH_RC production_rc=$PROD_RC overall=SUCCESS ledger=83/0 no-op=verified — evidence in $OUT"
else
  echo "F0_FUNCTIONAL_FIRST_FAILED fresh_rc=$FRESH_RC production_rc=$PROD_RC overall=$SUMMARY_OVERALL — evidence in $OUT" >&2
fi
exit "${SUMMARY_EXIT:-1}"
