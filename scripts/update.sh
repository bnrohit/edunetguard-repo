#!/bin/bash
set -euo pipefail

echo "Updating EduNetGuard Continuity Console..."

if [[ ! -f docker-compose.yml ]]; then
  echo "ERROR: run this script from the EduNetGuard repository root."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

get_env_value() {
  local key="$1"
  sed -n "s/^${key}=//p" .env | tail -n 1
}

if [[ -z "$(get_env_value AUTH_SECRET)" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 32)"
  else
    secret="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  fi
  set_env_value AUTH_SECRET "$secret"
  echo "Generated a new EduNetGuard AUTH_SECRET."
fi

if [[ -z "$(get_env_value USER_JOIN_CODE)" ]]; then
  echo "NOTICE: USER_JOIN_CODE is empty. Normal user registration will remain disabled."
fi

if [[ -z "$(get_env_value ADMIN_JOIN_CODE)" ]]; then
  echo "NOTICE: ADMIN_JOIN_CODE is empty. New administrator registration will remain disabled."
fi

echo "== Git =="
git fetch origin
git checkout main
git pull --ff-only origin main

echo "== Persistent data =="
echo "Monitoring history volume: uptime-kuma-data"
echo "EduNetGuard account volume: edunetguard-user-data"
echo "Neither volume is removed by this updater."

echo "== Pull current Uptime Kuma 2.x engine =="
docker compose pull uptime-kuma

echo "== Build EduNetGuard =="
docker compose build --pull frontend backend

echo "== Reconcile services =="
docker compose up -d

echo "== Verify =="
docker compose ps
curl -fsS "http://127.0.0.1:${API_PORT:-4000}/health"
echo
curl -fsSI "http://127.0.0.1:${WEB_PORT:-3000}" | head

echo
echo "== Monitoring engine version =="
docker exec edunetguard-kuma node -p "require('./package.json').version" 2>/dev/null || true

echo
echo "EduNetGuard update complete."
echo "Dashboard: /"
echo "Personal dashboard: /me"
echo "Admin console: /admin"
