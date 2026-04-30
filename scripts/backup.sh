#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="edunetguard_backup_${TIMESTAMP}.tar.gz"

echo "Creating backup: $BACKUP_FILE"

mkdir -p "$BACKUP_DIR"

# Backup Uptime Kuma data
docker run --rm -v edunetguard_uptime-kuma-data:/data -v "$(pwd)/$BACKUP_DIR:/backup" alpine tar czf "/backup/$BACKUP_FILE" -C /data .

echo "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"
