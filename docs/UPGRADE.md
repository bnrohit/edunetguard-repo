# EduNetGuard v0.3 Upgrade Guide

v0.3 turns EduNetGuard into the only network-facing operations console while keeping the existing monitoring engine and its data intact.

## What changes

- EduNetGuard Continuity Console branding
- Native monitoring admin binds to `127.0.0.1:3001` instead of all interfaces
- EduNetGuard backend API binds to `127.0.0.1:4000`
- User-facing dashboard remains on port `3000`
- Continuity health score, average response time, slowest response and telemetry freshness
- Search, status filters and group filters
- Attention-first service sorting
- Live operations queue replaces synthetic incident timestamps
- Monitoring source is presented to users as the EduNetGuard Monitoring Engine
- Existing persistent monitoring volume is preserved

## Critical data-safety rule

Do **not** run:

```bash
docker compose down -v
```

The `-v` option can remove the persistent monitoring-data volume.

## Upgrade on an existing server

From the existing repository directory:

```bash
cd ~/edunetguard-repo

git status --short
git checkout main
git fetch origin
git pull --ff-only origin main

docker compose config >/dev/null && echo "Compose OK"

docker compose pull uptime-kuma
docker compose build --pull frontend backend
docker compose up -d

docker compose ps
curl -fsS http://127.0.0.1:4000/health
echo
curl -fsSI http://127.0.0.1:3000 | head
```

The existing `uptime-kuma-data` volume is reused. No monitor history should be deleted by this procedure.

## Verify hardened bindings

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
sudo ss -lntp | grep -E ':(3000|3001|4000)\b' || true
```

Expected behavior:

- `3000` may listen on the server network for the EduNetGuard dashboard.
- `3001` should bind only to `127.0.0.1`.
- `4000` should bind only to `127.0.0.1`.

## Access the monitoring admin after v0.3

From an authorized workstation, create an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 rohith@<edunetguard-server>
```

Keep that SSH session open and browse to:

```text
http://127.0.0.1:3001
```

The admin interface is no longer directly available from other LAN clients.

## Validate the branded console

Open:

```text
http://<edunetguard-server>:3000
```

Verify:

- EduNetGuard / GMCS Network Operations branding
- no native monitoring-engine branding in the normal user interface
- live monitor counts and 24-hour availability
- continuity insights
- search and filters
- operational groups
- operations queue
- published incident banner, when one exists

## Rollback application code

Find the previous known-good commit:

```bash
git log --oneline -10
```

Then:

```bash
git checkout <previous-known-good-commit>
docker compose build frontend backend
docker compose up -d
```

Do not delete the persistent volume during rollback.

## Troubleshooting

### EduNetGuard reports telemetry unavailable

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 uptime-kuma
curl -fsS http://127.0.0.1:4000/health
```

### Need native monitoring administration

Use the SSH tunnel described above. Do not reopen port 3001 to the whole LAN merely for convenience.

### Confirm persistent monitoring volume

```bash
docker volume ls | grep uptime-kuma
docker inspect edunetguard-kuma --format '{{json .Mounts}}'
```
