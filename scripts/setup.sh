#!/bin/sh
set -eu

echo "🏫 EduNetGuard Setup"
echo "===================="

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed. Install Docker first: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose v2 is not available. Install/update Docker Compose."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
fi

mkdir -p data logs

echo "Pulling pinned base images..."
docker compose pull uptime-kuma || true

echo "Building EduNetGuard..."
docker compose build

echo "Starting services..."
docker compose up -d

echo ""
echo "✅ EduNetGuard is starting."
echo "Dashboard:       http://localhost:3000"
echo "Uptime Kuma:     http://localhost:3001"
echo "Backend health:  http://localhost:4000/health"
echo ""
echo "If Uptime Kuma is not configured yet, the dashboard uses embedded demo data."
