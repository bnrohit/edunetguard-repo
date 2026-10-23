# EduNetGuard v0.5 Upgrade Guide

v0.5 adds user-owned monitoring directly to **My Dashboard** while preserving the existing central Uptime Kuma monitoring engine.

## Data preserved

The existing persistent volumes remain in use:

- `uptime-kuma-data` — centrally managed monitoring configuration and history
- `edunetguard-user-data` — accounts, encrypted user join code, personal dashboard preferences, personal monitors, and their recent history

Never run:

```bash
docker compose down -v
```

## 1. Update the repository

```bash
cd ~/edunetguard-repo
git checkout main
git fetch origin
git pull --ff-only origin main
```

Expected version:

```text
0.5.0
```

## 2. Configure personal-monitor policy

Public websites are allowed by default. Private/internal IPs are blocked unless explicitly approved.

For a deployment with internal monitoring, add only the networks normal users should be able to monitor. Example:

```bash
set_env() {
  KEY="$1"
  VALUE="$2"
  grep -q "^$KEY=" .env \
    && sed -i "s|^$KEY=.*|$KEY=$VALUE|" .env \
    || echo "$KEY=$VALUE" >> .env
}

set_env USER_MONITOR_MAX_PER_USER "20"
set_env USER_MONITOR_MIN_INTERVAL_SECONDS "30"
set_env USER_MONITOR_MAX_INTERVAL_SECONDS "86400"
set_env USER_MONITOR_HISTORY_LIMIT "120"
set_env USER_MONITOR_ALLOW_PUBLIC_TARGETS "true"

# EXAMPLE ONLY — replace with the approved internal ranges for your environment.
set_env USER_MONITOR_ALLOWED_CIDRS "10.128.0.0/16,10.250.0.0/16"
```

Do not automatically use `10.0.0.0/8` unless every authenticated user is authorized to monitor every private target in that range.

## 3. Build and apply

```bash
docker compose config >/dev/null && echo "Compose OK"

docker compose pull uptime-kuma
docker compose build --pull frontend backend
docker compose up -d

sleep 15
docker compose ps
```

The backend image now includes the ICMP ping utility needed for personal Ping/IP monitors.

## 4. Verify

```bash
echo "===== VERSION ====="
grep '"version"' frontend/package.json | head -1
grep '"version"' backend/package.json | head -1

echo
echo "===== API HEALTH ====="
curl -fsS http://127.0.0.1:4000/health
echo

echo
echo "===== CONTAINERS ====="
docker compose ps

echo
echo "===== PERSISTENT USER DATA ====="
docker volume ls | grep edunetguard-user

echo
echo "===== NGINX ====="
docker exec edunetguard-frontend nginx -v

echo
echo "===== MDNS ====="
sudo ss -lunp | grep ':5353' || echo "PASS - UDP/5353 closed"
```

Expected EduNetGuard API version: `0.5.0`.

## 5. User workflow

A signed-in user opens:

```text
http://<server>:3000/me
```

Then:

1. Select **Add Monitor**.
2. Choose Website, Ping/IP, TCP Port, or DNS.
3. Enter a friendly name and target.
4. Choose interval and timeout.
5. Save.

EduNetGuard validates the target against the server-side policy and immediately runs the first check.

The user can subsequently:

- Check Now
- Edit
- Pause
- Resume
- Delete
- View recent up/down history

## 6. Admin workflow

An administrator opens:

```text
http://<server>:3000/admin
```

The **User-Owned Monitors** section shows monitors grouped by owner. Admins can pause/resume or delete any user-created monitor.

## Security behavior

- Monitor ownership is enforced server-side.
- Users cannot modify another user's monitor by changing browser requests.
- The default quota is 20 monitors/user.
- Minimum default interval is 30 seconds.
- Manual checks are rate-limited.
- HTTP redirects are disabled for personal monitors.
- Targets are DNS-resolved and checked against the target policy before connection.
- Loopback, link-local, multicast and unapproved private addresses are rejected.
