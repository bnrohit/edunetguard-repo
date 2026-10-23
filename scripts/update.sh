#!/bin/bash
set -euo pipefail

echo "Updating EduNetGuard Continuity Console..."

if [[ ! -f docker-compose.yml ]]; then
  echo "ERROR: run this script from the EduNetGuard repository root."
  exit 1
fi

echo "== Git =="
git fetch origin
git checkout main
git pull --ff-only origin main

echo "== Preserve monitoring data =="
echo "The persistent uptime-kuma-data volume is not removed or recreated."

echo "== Pull monitoring engine image =="
docker compose pull uptime-kuma

echo "== Build branded application =="
docker compose build --pull frontend backend

echo "== Reconcile services =="
docker compose up -d

echo "== Verify =="
docker compose ps
curl -fsS http://127.0.0.1:${API_PORT:-4000}/health
echo
curl -fsSI http://127.0.0.1:${WEB_PORT:-3000} | head

echo
echo "EduNetGuard update complete."
echo "Monitoring admin is loopback-only by default; use an SSH tunnel when administration is required."
