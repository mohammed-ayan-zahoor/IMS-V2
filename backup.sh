#!/usr/bin/env bash

# Exit on error
set -e

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/tmp/ims_backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ARCHIVE_NAME="ims_full_backup_${TIMESTAMP}.tar.gz"
B2_BUCKET="b2-backup:IMSBackUp"
RETENTION_DAYS_LOCAL=7
RETENTION_DAYS_REMOTE=30

echo "[$(date)] Starting IMS-V2 full backup..."

# 1. Setup local temporary directory
mkdir -p "${BACKUP_DIR}/dump"

# 2. Extract MONGODB_URI from .env.local if present
if [ -f "${APP_DIR}/.env.local" ]; then
    export $(grep -v '^#' "${APP_DIR}/.env.local" | xargs)
fi

# Fallback URI if not set in .env.local
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/ims}"

# 3. Perform MongoDB Dump
echo "[$(date)] Dumping MongoDB database..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}/dump" --quiet

# 4. Copy .env.local for full disaster recovery setup
if [ -f "${APP_DIR}/.env.local" ]; then
    cp "${APP_DIR}/.env.local" "${BACKUP_DIR}/dump/env.local.backup"
fi

# 5. Compress Everything into a single Tarball
echo "[$(date)] Compressing archive..."
cd "${BACKUP_DIR}"
tar -czf "${ARCHIVE_NAME}" dump/
rm -rf dump/

# 6. Upload Archive to Backblaze B2
echo "[$(date)] Uploading ${ARCHIVE_NAME} to Backblaze B2 (${B2_BUCKET})..."
rclone copy "${BACKUP_DIR}/${ARCHIVE_NAME}" "${B2_BUCKET}" --quiet

# 7. Cleanup local backups older than RETENTION_DAYS_LOCAL days
find "${BACKUP_DIR}" -type f -name "ims_full_backup_*.tar.gz" -mtime +${RETENTION_DAYS_LOCAL} -delete

# 8. Cleanup remote backups older than RETENTION_DAYS_REMOTE days in Backblaze B2
rclone delete "${B2_BUCKET}" --min-age ${RETENTION_DAYS_REMOTE}d --quiet

echo "[$(date)] Backup completed successfully!"
