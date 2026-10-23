# EduNetGuard v0.6 Upgrade Guide

v0.6 adds smart status cubes, automatic device identification, and device-specific troubleshooting guidance.

## Data preserved

The existing persistent volumes remain unchanged:

- `uptime-kuma-data` — district monitoring configuration/history
- `edunetguard-user-data` — accounts, join-code state, personal monitors, discovery metadata, and monitor history

Never run:

```bash
docker compose down -v
```

## 1. Update

```bash
cd ~/edunetguard-repo
git checkout main
git fetch origin
git pull --ff-only origin main
```

Expected frontend/backend version: `0.6.0`.

## 2. Configure discovery

Keep your existing personal-monitor policy and add:

```env
USER_MONITOR_AUTO_DISCOVERY=true
USER_MONITOR_DISCOVERY_TIMEOUT_SECONDS=20
```

Private targets are fingerprinted only when they are already allowed by:

```env
USER_MONITOR_ALLOWED_CIDRS=10.128.0.0/16,10.250.0.0/16
```

Use only the internal ranges that your authenticated EduNetGuard users are authorized to monitor.

## 3. Build and apply

```bash
docker compose config >/dev/null && echo "Compose OK"

docker compose build --pull frontend backend
docker compose up -d

sleep 15
docker compose ps
```

The backend image now contains both `ping` and `nmap`.

## 4. Verify

```bash
echo "===== VERSION ====="
grep '"version"' frontend/package.json | head -1
grep '"version"' backend/package.json | head -1

echo
echo "===== HEALTH ====="
curl -fsS http://127.0.0.1:4000/health
echo

echo
echo "===== DISCOVERY TOOLS ====="
docker exec edunetguard-backend nmap --version | head -3
docker exec edunetguard-backend ping -V | head -1 || true

echo
echo "===== CONTAINERS ====="
docker compose ps

echo
echo "===== MDNS ====="
sudo ss -lunp | grep ':5353' || echo "PASS - UDP/5353 closed"
```

## 5. Existing user monitors

Existing v0.5 monitors remain valid. They will show under the default site:

```text
My Organization
```

Open a monitor and select **Identify Again** to populate its device profile.

You may edit the monitor and assign a more useful site/organization name such as `SSC`, `GPHS`, `NOC`, or `District Websites`.

## 6. New monitor workflow

New monitors automatically schedule device identification after their first health check.

Private approved targets may receive the small single-host Nmap service fingerprint documented in `docs/SMART_OPERATIONS.md`. Public targets receive DNS/HTTP/TLS discovery only.
