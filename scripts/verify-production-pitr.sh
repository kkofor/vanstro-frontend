#!/bin/sh
set -eu

COMPOSE_ROOT=${COMPOSE_ROOT:-/opt/vanstro-production/app}
ENV_FILE=${ENV_FILE:-/opt/vanstro-production/.env.production}
PROJECT=${PROJECT:-vanstro-production}
BACKUP_ROOT=${BACKUP_ROOT:-/www/backup/vanstro-production}
LATEST_BASE=${1:-$(find "$BACKUP_ROOT/base" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)}
IMAGE=${POSTGRES_IMAGE:-postgres:16-alpine}
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"')
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"')
[ -n "$POSTGRES_USER" ]
[ -n "$POSTGRES_DB" ]
VERIFY_NAME=vanstro-pitr-verify-$$
VERIFY_VOLUME=${VERIFY_NAME}-data

[ -n "$LATEST_BASE" ] && [ -s "$LATEST_BASE/base.tar.gz" ]
WAL_DIR=$(docker volume inspect "${PROJECT}_production_postgres_backups" --format '{{.Mountpoint}}')/wal
[ -d "$WAL_DIR" ]
PRODUCTION_POSTGRES=${PRODUCTION_POSTGRES:-${PROJECT}-postgres-1}
EXPECTED_HEARTBEAT=$(docker exec "$PRODUCTION_POSTGRES" sh -euc '
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select extract(epoch from \"lastSucceededAt\")::bigint from worker_heartbeats where key='\''primary'\''"
')
case "$EXPECTED_HEARTBEAT" in ""|*[!0-9]*) exit 1;; esac
docker exec "$PRODUCTION_POSTGRES" sh -euc '
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select pg_switch_wal()" >/dev/null
'

cleanup() {
  docker rm -f "$VERIFY_NAME" >/dev/null 2>&1 || true
  docker volume rm "$VERIFY_VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
cleanup

docker volume create "$VERIFY_VOLUME" >/dev/null
docker run --rm -u root \
  -v "$VERIFY_VOLUME:/var/lib/postgresql/data" \
  -v "$LATEST_BASE:/source:ro" \
  "$IMAGE" sh -lc '
    tar -xzf /source/base.tar.gz -C /var/lib/postgresql/data
    chmod 700 /var/lib/postgresql/data
    touch /var/lib/postgresql/data/recovery.signal
    printf "%s\n" "restore_command = '\''cp /wal/%f %p'\''" >> /var/lib/postgresql/data/postgresql.auto.conf
  '

docker run -d --name "$VERIFY_NAME" \
  -v "$VERIFY_VOLUME:/var/lib/postgresql/data" \
  -v "$WAL_DIR:/wal:ro" \
  "$IMAGE" >/dev/null

attempt=0
until docker exec "$VERIFY_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 90 ] || { docker logs "$VERIFY_NAME"; exit 1; }
  sleep 1
done

docker exec -e VERIFY_DB="$POSTGRES_DB" -e VERIFY_USER="$POSTGRES_USER" -e EXPECTED_HEARTBEAT="$EXPECTED_HEARTBEAT" "$VERIFY_NAME" sh -euc '
  migrations=$(psql -v ON_ERROR_STOP=1 -U "$VERIFY_USER" -d "$VERIFY_DB" -Atc "select count(*) from _prisma_migrations where finished_at is not null and rolled_back_at is null")
  case "$migrations" in ""|*[!0-9]*) exit 1;; esac
  [ "$migrations" -ge 40 ]
  products=$(psql -v ON_ERROR_STOP=1 -U "$VERIFY_USER" -d "$VERIFY_DB" -Atc "select count(*) from products")
  heartbeat=$(psql -v ON_ERROR_STOP=1 -U "$VERIFY_USER" -d "$VERIFY_DB" -Atc "select extract(epoch from \"lastSucceededAt\")::bigint from worker_heartbeats where key='\''primary'\''")
  case "$products:$heartbeat" in *[!0-9:]*) exit 1;; esac
  [ "$heartbeat" -ge "$EXPECTED_HEARTBEAT" ]
  echo "PITR restore verification passed: migrations=$migrations products=$products heartbeat=$heartbeat expected=$EXPECTED_HEARTBEAT"
'
