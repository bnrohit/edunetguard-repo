# EduNetGuard v0.2 Upgrade Guide

This release keeps Uptime Kuma as the monitoring engine and upgrades EduNetGuard into the branded operations/status layer.

## What changes in v0.2

- New EduNetGuard operations dashboard and product branding
- Correct Uptime Kuma v2 public status-page integration
- 24-hour uptime pulled from Uptime Kuma heartbeat data
- Live response-time display where Uptime Kuma provides ping data
- Maintenance, pending, degraded, and outage states
- Active Uptime Kuma incident display
- Configurable Uptime Kuma status-page slug
- Clear demo-mode warning when live monitoring is not connected

## Important: your existing Uptime Kuma data is preserved

The Docker volume `uptime-kuma-data` is unchanged. Upgrading the EduNetGuard frontend/backend does not recreate your existing Uptime Kuma monitors.

Do not run `docker compose down -v` during an upgrade. The `-v` option removes persistent volumes and can delete monitoring data.

## 1. Back up first

From the EduNetGuard project directory:

```bash
docker compose ps
docker compose stop uptime-kuma

docker run --rm \
  -v "$(docker volume ls -q | grep 'uptime-kuma-data' | head -n 1):/source:ro" \
  -v "$PWD:/backup" \
  alpine sh -c 'cd /source && tar czf /backup/uptime-kuma-backup-$(date +%Y%m%d-%H%M%S).tar.gz .'

docker compose start uptime-kuma
```

If your Docker volume has a custom name, replace the volume expression with that exact volume name.

## 2. Update the code

```bash
cd /path/to/edunetguard-repo
git fetch origin
git checkout main
git pull --ff-only origin main
```

## 3. Update `.env`

Add this line if it is not already present:

```env
UPTIME_KUMA_STATUS_PAGE=edunetguard
```

Recommended production settings:

```env
UPTIME_KUMA_URL=http://uptime-kuma:3001
UPTIME_KUMA_STATUS_PAGE=edunetguard
CACHE_TTL=30
ALLOW_DEMO_FALLBACK=false
TZ=America/Denver
```

Use `ALLOW_DEMO_FALLBACK=true` only when you intentionally want the sample dashboard to appear if live monitoring is unavailable.

## 4. Publish the EduNetGuard status page in Uptime Kuma

Open the Uptime Kuma admin interface on port `3001`.

1. Open **Status Pages**.
2. Create a status page.
3. Use the slug `edunetguard` or set `UPTIME_KUMA_STATUS_PAGE` to the slug you choose.
4. Add the monitors that EduNetGuard should display.
5. Organize monitors into groups such as Core Infrastructure, Servers, Network Services, Schools, Wireless, Voice, or Learning Platforms.
6. Publish/save the status page.

EduNetGuard intentionally reads the published status-page API instead of requiring the Uptime Kuma administrator password.

## 5. Rebuild and restart EduNetGuard

```bash
docker compose pull uptime-kuma
docker compose build --pull frontend backend
docker compose up -d
```

## 6. Verify

```bash
docker compose ps
curl -fsS http://localhost:4000/health
curl -fsS http://localhost:4000/status
```

The `/status` response should contain:

```json
{
  "demo_mode": false,
  "source": {
    "engine": "Uptime Kuma",
    "connected": true,
    "status_page_slug": "edunetguard"
  }
}
```

Then open the EduNetGuard dashboard on port `3000`.

## Rollback

If you need to roll back only the EduNetGuard code:

```bash
git log --oneline -10
git checkout <previous-known-good-commit>
docker compose build frontend backend
docker compose up -d
```

The Uptime Kuma Docker volume remains separate from the application code.

## Troubleshooting

### EduNetGuard shows demo data

Check:

```bash
docker compose logs --tail=100 backend
curl -i http://localhost:3001/api/status-page/edunetguard
curl -i http://localhost:3001/api/status-page/heartbeat/edunetguard
```

Both Uptime Kuma endpoints should return HTTP 200. If they return 404, confirm that the status page exists, uses the configured slug, is published, and contains monitors.

### Dashboard is reachable but monitor data is old

```bash
docker compose restart backend
docker compose logs -f backend
```

EduNetGuard caches monitor summaries for the number of seconds configured by `CACHE_TTL`.

### Do not expose unnecessary ports publicly

For an internal deployment, restrict ports `3001` and `4000` with host firewall rules or a reverse proxy. The normal EduNetGuard user-facing dashboard is port `3000`.
