# EduNetGuard v0.3.1 Upgrade Guide

v0.3.1 adds a branded Admin Console directly inside EduNetGuard.

## New in v0.3.1

- Dashboard / Admin navigation in the EduNetGuard header
- Admin Console at `/admin`
- Monitoring engine connectivity and API health
- Monitor, alert, maintenance and response-time summaries
- One-click **Open Monitor Management** button
- Monitoring data remains in the existing persistent volume
- Backend API remains loopback-only

## Important

Do **not** run:

```bash
docker compose down -v
```

That can remove the monitoring-data volume.

## Existing GMCS server

On the current internal server, set the monitor-management service to the server's trusted internal interface:

```bash
cd ~/edunetguard-repo

grep -q '^KUMA_BIND_IP=' .env 2>/dev/null \
  && sed -i 's/^KUMA_BIND_IP=.*/KUMA_BIND_IP=10.250.31.192/' .env \
  || echo 'KUMA_BIND_IP=10.250.31.192' >> .env

grep -q '^KUMA_ADMIN_PORT=' .env 2>/dev/null \
  && sed -i 's/^KUMA_ADMIN_PORT=.*/KUMA_ADMIN_PORT=3001/' .env \
  || echo 'KUMA_ADMIN_PORT=3001' >> .env
```

The monitoring engine keeps its own administrator login. Do not expose port 3001 beyond trusted internal management access.

## Update code and containers

```bash
cd ~/edunetguard-repo

git checkout main
git fetch origin
git pull --ff-only origin main

docker compose config >/dev/null && echo "Compose OK"

docker compose pull uptime-kuma
docker compose build --pull frontend backend
docker compose up -d

docker compose ps
```

## Verify

```bash
echo "===== VERSION ====="
grep '"version"' frontend/package.json | head -1

echo "===== HEALTH ====="
curl -fsS http://127.0.0.1:4000/health
echo

echo "===== FRONTEND ====="
curl -fsSI http://127.0.0.1:3000 | head

echo "===== PORTS ====="
sudo ss -lntp | grep -E ':(3000|3001|4000)\b' || true
```

Expected GMCS behavior:

- `3000` — EduNetGuard Dashboard and Admin Console
- `10.250.31.192:3001` — authenticated Monitor Management
- `127.0.0.1:4000` — backend API only

## Use

Normal operations:

```text
http://10.250.31.192:3000
```

Admin Console:

```text
http://10.250.31.192:3000/admin
```

From there click **Open Monitor Management** when you need to add or edit monitors.

## Security

Uptime Kuma does not support being reliably mounted under a subdirectory such as `/admin`, so EduNetGuard keeps its own branded Admin Console at `/admin` and opens the authenticated monitor editor on its dedicated port when needed.

Restrict port 3001 to trusted internal administrators using your normal network/firewall controls.
