#!/usr/bin/env bash
set -euo pipefail
umask 077

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
project_dir="$(cd -- "$script_dir/.." && pwd -P)"
compose_file="$project_dir/compose.production.yaml"
destination="${1:-${EQUIPQR_BACKUP_DIR:-/var/backups/equipqr}}"
mkdir -p "$destination"
chmod 700 "$destination"
destination="$(cd -- "$destination" && pwd -P)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$destination/equipqr-$stamp.sql.gz"
checksum="$output.sha256"
stage_dir="$(mktemp -d "$destination/.equipqr-$stamp.XXXXXX")"
stage_backup="$stage_dir/$(basename -- "$output")"
stage_checksum="$stage_dir/$(basename -- "$checksum")"

cleanup() {
  rm -f -- "$stage_backup" "$stage_checksum"
  rmdir -- "$stage_dir" 2>/dev/null || true
}
trap cleanup EXIT

if [[ -e "$output" || -e "$checksum" ]]; then
  echo "Backup already exists for timestamp: $stamp" >&2
  exit 1
fi

docker compose -f "$compose_file" exec -T db \
  pg_dump --username equipqr --dbname equipqr --format=plain --no-owner --no-privileges --clean --if-exists \
  | gzip > "$stage_backup"

gzip -t "$stage_backup"
(
  cd -- "$stage_dir"
  sha256sum "$(basename -- "$stage_backup")" > "$(basename -- "$stage_checksum")"
  sha256sum --check --strict "$(basename -- "$stage_checksum")"
)
chmod 600 "$stage_backup" "$stage_checksum"
mv -- "$stage_backup" "$output"
mv -- "$stage_checksum" "$checksum"
rmdir -- "$stage_dir"
trap - EXIT

echo "Backup written: $output"
echo "Checksum written: $checksum"
