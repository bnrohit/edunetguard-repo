#!/bin/bash
set -e

echo "Updating EduNetGuard..."

# Pull latest images
docker compose pull

# Rebuild custom images
docker compose build --no-cache

# Restart services
docker compose up -d

echo "✅ Update complete!"
