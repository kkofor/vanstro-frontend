#!/bin/sh
set -eu

BACKUP_ROOT=${BACKUP_ROOT:-/www/backup/vanstro-production}
COMPOSE_ROOT=${COMPOSE_ROOT:-/opt/vanstro-production/app}
ENV_FILE=${ENV_FILE:-/opt/vanstro-production/.env.production}
PROJECT=${PROJECT:-vanstro-production}
MODE=${1:-logical}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
LOCK_FILE=$BACKUP_ROOT/.backup.lock

mkdir -p "$BACKUP_ROOT"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another VanStro backup is running." >&2; exit 1; }

compose() {
  VANSTRO_PRODUCTION_ENV_FILE="$ENV_FILE" docker compose \
    --env-file "$ENV_FILE" \
    -p "$PROJECT" \
    -f "$COMPOSE_ROOT/docker-compose.production-server.yml" "$@"
}

case "$MODE" in
  logical)
    destination="$BACKUP_ROOT/$STAMP-automated-logical"
    install -d -m 700 "$destination"
    compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      > "$destination/vanstro-production.dump"
    test -s "$destination/vanstro-production.dump"
    compose exec -T postgres sh -lc 'pg_restore --list >/dev/null' \
      < "$destination/vanstro-production.dump"
    sha256sum "$destination/vanstro-production.dump" > "$destination/SHA256SUMS"
    chmod 600 "$destination"/*
    find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '*-automated-logical' -mtime +14 -exec rm -rf -- {} +
    ;;
  base)
    destination="$BACKUP_ROOT/base/$STAMP"
    install -d -m 700 "$destination"
    compose exec -T postgres sh -lc \
      'pg_basebackup -U "$POSTGRES_USER" -D - -Ft -z -X fetch -c fast' \
      > "$destination/base.tar.gz"
    test -s "$destination/base.tar.gz"
    gzip -t "$destination/base.tar.gz"
    sha256sum "$destination/base.tar.gz" > "$destination/SHA256SUMS"
    chmod 600 "$destination"/*

    # 本机只保留最新且已校验的 base 恢复链。固定天数保留在低流量下仍会因
    # archive_timeout 持续生成 16 MiB WAL，必须以 base 的真实起始 WAL 为边界。
    wal_boundary=$(tar -xOzf "$destination/base.tar.gz" backup_label \
      | sed -n 's/^START WAL LOCATION: .* (file \([0-9A-F]\{24\}\))$/\1/p' \
      | head -n 1)
    case "$wal_boundary" in
      [0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]) ;;
      *) echo "Cannot determine the base backup WAL boundary." >&2; exit 1 ;;
    esac

    wal_root=$(docker volume inspect "${PROJECT}_production_postgres_backups" --format '{{.Mountpoint}}')/wal
    find "$wal_root" -maxdepth 1 -type f -printf '%f\n' \
      | awk -v boundary="$wal_boundary" 'length($0) == 24 && $0 ~ /^[0-9A-F]+$/ && $0 < boundary' \
      | while IFS= read -r wal_file; do
          rm -f -- "$wal_root/$wal_file"
        done
    find "$BACKUP_ROOT/base" -mindepth 1 -maxdepth 1 -type d ! -path "$destination" -exec rm -rf -- {} +
    ;;
  *)
    echo "Usage: $0 logical|base" >&2
    exit 2
    ;;
esac

echo "VanStro PostgreSQL $MODE backup completed: $destination"
