#!/usr/bin/env bash
set -euo pipefail

destination="${1:-./backups}"
mkdir -p "$destination"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$destination/equipqr-$stamp.sql.gz"

docker compose -f compose.production.yaml exec -T db \
  pg_dump --username equipqr --dbname equipqr --format=plain --no-owner --no-privileges --clean --if-exists \
  | gzip > "$output"

echo "Backup written: $output"
