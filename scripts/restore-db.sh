#!/usr/bin/env bash
set -euo pipefail
umask 077

backup="${1:?Usage: scripts/restore-db.sh BACKUP.sql.gz}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
project_dir="$(cd -- "$script_dir/.." && pwd -P)"
compose_file="$project_dir/compose.production.yaml"

if [[ ! -f "$backup" ]]; then
  echo "Backup not found: $backup" >&2
  exit 1
fi

backup_dir="$(cd -- "$(dirname -- "$backup")" && pwd -P)"
backup="$backup_dir/$(basename -- "$backup")"
checksum="$backup.sha256"

if [[ ! -f "$checksum" ]]; then
  echo "Checksum file is required: $checksum" >&2
  exit 1
fi

checksum_line_count="$(awk 'END { print NR }' "$checksum")"
read -r recorded_digest recorded_name trailing < "$checksum"
if [[ "$checksum_line_count" != "1" || ! "$recorded_digest" =~ ^[[:xdigit:]]{64}$ || "$recorded_name" != "$(basename -- "$backup")" || -n "${trailing:-}" ]]; then
  echo "Checksum must contain exactly one SHA-256 entry for $(basename -- "$backup")." >&2
  exit 1
fi

(
  cd -- "$backup_dir"
  sha256sum --check --strict "$(basename -- "$checksum")"
)
gzip -t "$backup"

expected="RESTORE $(basename -- "$backup")"
echo "This replaces the EquipQR database with $(basename -- "$backup")."
echo "Type RESTORE $(basename -- "$backup") to continue:"
read -r confirmation
if [[ "$confirmation" != "$expected" ]]; then
  echo "Restore cancelled." >&2
  exit 1
fi

restore_started=1
restore_succeeded=0
on_failure() {
  status=$?
  trap - ERR EXIT
  if [[ "$restore_started" == "1" && "$restore_succeeded" != "1" ]]; then
    echo "Restore failed; web and tunnel will remain stopped." >&2
    docker compose -f "$compose_file" stop tunnel web >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap on_failure ERR EXIT

echo "Stopping web traffic before the safety snapshot and restore..."
docker compose -f "$compose_file" stop tunnel web

pre_restore_dir="${EQUIPQR_PRE_RESTORE_BACKUP_DIR:-$backup_dir/pre-restore}"
"$script_dir/backup-db.sh" "$pre_restore_dir"

gzip -dc "$backup" | docker compose -f "$compose_file" exec -T db \
  psql --username equipqr --dbname equipqr --single-transaction --set ON_ERROR_STOP=1

docker compose -f "$compose_file" run --rm migrate
docker compose -f "$compose_file" up -d web

ready=0
for _attempt in {1..20}; do
  if docker compose -f "$compose_file" exec -T web \
    node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    ready=1
    break
  fi
  sleep 3
done

if [[ "$ready" != "1" ]]; then
  echo "Web readiness check did not pass; tunnel will remain stopped." >&2
  exit 1
fi

docker compose -f "$compose_file" up -d tunnel
restore_succeeded=1
trap - ERR EXIT

echo "Restore, migration, readiness check, and service restart completed."
