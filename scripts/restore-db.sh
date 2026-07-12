#!/usr/bin/env bash
set -euo pipefail

backup="${1:?Usage: scripts/restore-db.sh BACKUP.sql.gz}"
test -f "$backup"

echo "This replaces the EquipQR database. Type RESTORE to continue:"
read -r confirmation
test "$confirmation" = "RESTORE"

gzip -dc "$backup" | docker compose -f compose.production.yaml exec -T db \
  psql --username equipqr --dbname equipqr --single-transaction --set ON_ERROR_STOP=1

echo "Restore completed."
